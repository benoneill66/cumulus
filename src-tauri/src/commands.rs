//! Tauri commands — the bridge between the React UI and the AWS CLI. Each command
//! reads region/profile from settings, shells out via `awscli`, and shapes the
//! result into the structs in `models.rs`.

use crate::awscli::{run_json, run_raw};
use crate::models::*;
use base64::Engine;
use chrono::Utc;
use parking_lot::RwLock;
use serde_json::Value;
use std::path::PathBuf;
use tauri::State;

pub struct AppState {
    pub settings: RwLock<Settings>,
    pub settings_path: PathBuf,
}

impl AppState {
    fn rp(&self) -> (String, String) {
        let s = self.settings.read();
        (s.region.clone(), s.profile.clone())
    }
}

type R<T> = Result<T, String>;
fn e<T>(r: anyhow::Result<T>) -> R<T> {
    r.map_err(|x| x.to_string())
}

// ---------- small Value extractors ----------
fn gs(v: &Value, k: &str) -> String {
    v.get(k).and_then(|x| x.as_str()).unwrap_or("").to_string()
}
fn gi(v: &Value, k: &str) -> i64 {
    v.get(k).and_then(|x| x.as_i64()).unwrap_or(0)
}
fn gb(v: &Value, k: &str) -> bool {
    v.get(k).and_then(|x| x.as_bool()).unwrap_or(false)
}
fn arr<'a>(v: &'a Value, k: &str) -> &'a [Value] {
    v.get(k).and_then(|x| x.as_array()).map(|a| a.as_slice()).unwrap_or(&[])
}
/// Last path segment of an ARN (e.g. service or task-def family:revision).
fn tail(arn: &str) -> String {
    arn.rsplit('/').next().unwrap_or(arn).to_string()
}

// ============================================================
// Settings & identity
// ============================================================

#[tauri::command]
pub fn get_settings(state: State<AppState>) -> Settings {
    state.settings.read().clone()
}

#[tauri::command]
pub fn save_settings(state: State<AppState>, settings: Settings) -> R<()> {
    {
        let mut s = state.settings.write();
        *s = settings.clone();
    }
    let json = serde_json::to_string_pretty(&settings).map_err(|x| x.to_string())?;
    std::fs::write(&state.settings_path, json).map_err(|x| x.to_string())?;
    Ok(())
}

/// Profile names from ~/.aws/config (and "default" if a credentials file exists).
#[tauri::command]
pub fn list_profiles() -> Vec<String> {
    let mut out = vec!["default".to_string()];
    if let Ok(home) = std::env::var("HOME") {
        let cfg = std::fs::read_to_string(PathBuf::from(&home).join(".aws/config")).unwrap_or_default();
        for line in cfg.lines() {
            let l = line.trim();
            if let Some(rest) = l.strip_prefix("[profile ") {
                if let Some(name) = rest.strip_suffix(']') {
                    let name = name.trim().to_string();
                    if !out.contains(&name) {
                        out.push(name);
                    }
                }
            }
        }
    }
    out
}

/// Common AWS regions for the region picker.
#[tauri::command]
pub fn list_regions() -> Vec<String> {
    [
        "eu-west-1", "eu-west-2", "eu-central-1", "us-east-1", "us-east-2",
        "us-west-1", "us-west-2", "ap-south-1", "ap-southeast-1", "ap-southeast-2",
        "ap-northeast-1", "ca-central-1", "sa-east-1",
    ]
    .iter()
    .map(|s| s.to_string())
    .collect()
}

#[tauri::command]
pub async fn check_auth(state: State<'_, AppState>) -> R<Identity> {
    let (region, profile) = state.rp();
    match run_json(&region, &profile, &["sts", "get-caller-identity"]).await {
        Ok(v) => Ok(Identity {
            ok: true,
            account: gs(&v, "Account"),
            arn: gs(&v, "Arn"),
            user_id: gs(&v, "UserId"),
            profile: profile.clone(),
            region: region.clone(),
            error: String::new(),
        }),
        Err(err) => Ok(Identity {
            ok: false,
            account: String::new(),
            arn: String::new(),
            user_id: String::new(),
            profile,
            region,
            error: err.to_string(),
        }),
    }
}

/// Run `aws sso login` for the active profile (opens the browser). Returns when done.
#[tauri::command]
pub async fn sso_login(state: State<'_, AppState>) -> R<String> {
    let (region, profile) = state.rp();
    e(run_raw(&region, &profile, &["sso", "login"]).await)
}

// ============================================================
// ECS
// ============================================================

async fn ecs_clusters_inner(region: &str, profile: &str) -> anyhow::Result<Vec<EcsCluster>> {
    let list = run_json(region, profile, &["ecs", "list-clusters"]).await?;
    let arns: Vec<String> = arr(&list, "clusterArns").iter().filter_map(|x| x.as_str().map(String::from)).collect();
    if arns.is_empty() {
        return Ok(vec![]);
    }
    let mut args = vec!["ecs", "describe-clusters", "--clusters"];
    for a in &arns {
        args.push(a.as_str());
    }
    let desc = run_json(region, profile, &args).await?;
    let mut out = vec![];
    for c in arr(&desc, "clusters") {
        out.push(EcsCluster {
            name: gs(c, "clusterName"),
            arn: gs(c, "clusterArn"),
            status: gs(c, "status"),
            services_count: gi(c, "activeServicesCount"),
            running_tasks: gi(c, "runningTasksCount"),
            pending_tasks: gi(c, "pendingTasksCount"),
        });
    }
    out.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(out)
}

fn service_health(status: &str, desired: i64, running: i64, deployments: &[EcsDeployment]) -> String {
    if status != "ACTIVE" {
        return "stopped".into();
    }
    let deploying = deployments.len() > 1
        || deployments.iter().any(|d| d.rollout_state == "IN_PROGRESS");
    if deploying {
        return "deploying".into();
    }
    if running < desired {
        return "degraded".into();
    }
    "healthy".into()
}

async fn ecs_services_inner(region: &str, profile: &str, cluster: &str) -> anyhow::Result<Vec<EcsService>> {
    let list = run_json(region, profile, &["ecs", "list-services", "--cluster", cluster]).await?;
    let arns: Vec<String> = arr(&list, "serviceArns").iter().filter_map(|x| x.as_str().map(String::from)).collect();
    if arns.is_empty() {
        return Ok(vec![]);
    }
    let mut out = vec![];
    // describe-services accepts up to 10 services per call.
    for chunk in arns.chunks(10) {
        let mut args = vec!["ecs", "describe-services", "--cluster", cluster, "--services"];
        for a in chunk {
            args.push(a.as_str());
        }
        let desc = run_json(region, profile, &args).await?;
        for s in arr(&desc, "services") {
            let deployments: Vec<EcsDeployment> = arr(s, "deployments")
                .iter()
                .map(|d| EcsDeployment {
                    status: gs(d, "status"),
                    desired: gi(d, "desiredCount"),
                    running: gi(d, "runningCount"),
                    pending: gi(d, "pendingCount"),
                    failed: gi(d, "failedTasks"),
                    rollout_state: gs(d, "rolloutState"),
                    created_at: gs(d, "createdAt"),
                })
                .collect();
            let events: Vec<EcsEvent> = arr(s, "events")
                .iter()
                .take(8)
                .map(|ev| EcsEvent {
                    created_at: gs(ev, "createdAt"),
                    message: gs(ev, "message"),
                })
                .collect();
            let status = gs(s, "status");
            let desired = gi(s, "desiredCount");
            let running = gi(s, "runningCount");
            out.push(EcsService {
                name: gs(s, "serviceName"),
                arn: gs(s, "serviceArn"),
                cluster: tail(cluster),
                status: status.clone(),
                desired,
                running,
                pending: gi(s, "pendingCount"),
                launch_type: gs(s, "launchType"),
                task_def: tail(&gs(s, "taskDefinition")),
                health: service_health(&status, desired, running, &deployments),
                deployments,
                events,
            });
        }
    }
    out.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(out)
}

#[tauri::command]
pub async fn ecs_clusters(state: State<'_, AppState>) -> R<Vec<EcsCluster>> {
    let (region, profile) = state.rp();
    e(ecs_clusters_inner(&region, &profile).await)
}

#[tauri::command]
pub async fn ecs_services(state: State<'_, AppState>, cluster: String) -> R<Vec<EcsService>> {
    let (region, profile) = state.rp();
    e(ecs_services_inner(&region, &profile, &cluster).await)
}

#[tauri::command]
pub async fn ecs_restart_service(state: State<'_, AppState>, cluster: String, service: String) -> R<String> {
    let (region, profile) = state.rp();
    run_json(&region, &profile, &["ecs", "update-service", "--cluster", &cluster, "--service", &service, "--force-new-deployment"])
        .await
        .map(|_| format!("Forced a new deployment of {service}."))
        .map_err(|x| x.to_string())
}

#[tauri::command]
pub async fn ecs_scale_service(state: State<'_, AppState>, cluster: String, service: String, desired: i64) -> R<String> {
    let (region, profile) = state.rp();
    let d = desired.to_string();
    run_json(&region, &profile, &["ecs", "update-service", "--cluster", &cluster, "--service", &service, "--desired-count", &d])
        .await
        .map(|_| format!("Set {service} desired count to {desired}."))
        .map_err(|x| x.to_string())
}

// ============================================================
// Lambda
// ============================================================

async fn lambda_inner(region: &str, profile: &str) -> anyhow::Result<Vec<LambdaFn>> {
    let v = run_json(region, profile, &["lambda", "list-functions"]).await?;
    let mut out = vec![];
    for f in arr(&v, "Functions") {
        out.push(LambdaFn {
            name: gs(f, "FunctionName"),
            runtime: gs(f, "Runtime"),
            memory: gi(f, "MemorySize"),
            timeout: gi(f, "Timeout"),
            code_size: gi(f, "CodeSize"),
            last_modified: gs(f, "LastModified"),
            description: gs(f, "Description"),
            handler: gs(f, "Handler"),
            state: gs(f, "State"),
        });
    }
    out.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(out)
}

#[tauri::command]
pub async fn lambda_functions(state: State<'_, AppState>) -> R<Vec<LambdaFn>> {
    let (region, profile) = state.rp();
    e(lambda_inner(&region, &profile).await)
}

#[tauri::command]
pub async fn lambda_invoke(state: State<'_, AppState>, name: String, payload: String) -> R<InvokeResult> {
    let (region, profile) = state.rp();
    let stamp = Utc::now().timestamp_millis();
    let tmp = std::env::temp_dir().join(format!("cumulus-invoke-{stamp}.json"));
    let tmp_str = tmp.to_string_lossy().to_string();

    let mut args = vec![
        "lambda", "invoke",
        "--function-name", &name,
        "--log-type", "Tail",
        "--cli-binary-format", "raw-in-base64-out",
    ];
    let p = payload.trim();
    if !p.is_empty() {
        args.push("--payload");
        args.push(p);
    }
    args.push(&tmp_str);

    let meta = run_json(&region, &profile, &args).await.map_err(|x| x.to_string())?;
    let status_code = gi(&meta, "StatusCode");
    let function_error = gs(&meta, "FunctionError");
    let log_b64 = gs(&meta, "LogResult");
    let log_tail = base64::engine::general_purpose::STANDARD
        .decode(log_b64.as_bytes())
        .ok()
        .and_then(|b| String::from_utf8(b).ok())
        .unwrap_or_default();
    let response = std::fs::read_to_string(&tmp).unwrap_or_default();
    let _ = std::fs::remove_file(&tmp);

    Ok(InvokeResult {
        ok: function_error.is_empty() && status_code == 200,
        status_code,
        function_error,
        payload: response,
        log_tail,
        duration_note: String::new(),
    })
}

// ============================================================
// CloudWatch alarms
// ============================================================

async fn alarms_inner(region: &str, profile: &str) -> anyhow::Result<Vec<Alarm>> {
    let v = run_json(region, profile, &["cloudwatch", "describe-alarms"]).await?;
    let mut out = vec![];
    for a in arr(&v, "MetricAlarms") {
        out.push(Alarm {
            name: gs(a, "AlarmName"),
            state: gs(a, "StateValue"),
            reason: gs(a, "StateReason"),
            metric: gs(a, "MetricName"),
            namespace: gs(a, "Namespace"),
            updated: gs(a, "StateUpdatedTimestamp"),
            actions_enabled: gb(a, "ActionsEnabled"),
        });
    }
    // ALARM first, then INSUFFICIENT_DATA, then OK; alphabetical within.
    fn rank(s: &str) -> u8 {
        match s {
            "ALARM" => 0,
            "INSUFFICIENT_DATA" => 1,
            _ => 2,
        }
    }
    out.sort_by(|a, b| rank(&a.state).cmp(&rank(&b.state)).then(a.name.cmp(&b.name)));
    Ok(out)
}

#[tauri::command]
pub async fn alarms(state: State<'_, AppState>) -> R<Vec<Alarm>> {
    let (region, profile) = state.rp();
    e(alarms_inner(&region, &profile).await)
}

// ============================================================
// CloudWatch Logs
// ============================================================

#[tauri::command]
pub async fn log_groups(state: State<'_, AppState>) -> R<Vec<LogGroup>> {
    let (region, profile) = state.rp();
    let v = run_json(&region, &profile, &["logs", "describe-log-groups", "--limit", "50"]).await.map_err(|x| x.to_string())?;
    let mut out = vec![];
    for g in arr(&v, "logGroups") {
        out.push(LogGroup {
            name: gs(g, "logGroupName"),
            stored_bytes: gi(g, "storedBytes"),
            retention_days: gi(g, "retentionInDays"),
        });
    }
    out.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(out)
}

#[tauri::command]
pub async fn log_tail(state: State<'_, AppState>, group: String, minutes: i64, filter: String) -> R<Vec<LogEvent>> {
    let (region, profile) = state.rp();
    let start = (Utc::now().timestamp_millis() - minutes.max(1) * 60_000).to_string();
    let mut args = vec![
        "logs", "filter-log-events",
        "--log-group-name", &group,
        "--start-time", &start,
        "--limit", "300",
        "--interleaved",
    ];
    let f = filter.trim();
    if !f.is_empty() {
        args.push("--filter-pattern");
        args.push(f);
    }
    let v = run_json(&region, &profile, &args).await.map_err(|x| x.to_string())?;
    let mut out = vec![];
    for ev in arr(&v, "events") {
        out.push(LogEvent {
            timestamp: gi(ev, "timestamp"),
            message: gs(ev, "message"),
            stream: gs(ev, "logStreamName"),
        });
    }
    out.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));
    Ok(out)
}

// ============================================================
// S3
// ============================================================

async fn buckets_inner(region: &str, profile: &str) -> anyhow::Result<Vec<Bucket>> {
    let v = run_json(region, profile, &["s3api", "list-buckets"]).await?;
    let mut out = vec![];
    for b in arr(&v, "Buckets") {
        out.push(Bucket {
            name: gs(b, "Name"),
            created: gs(b, "CreationDate"),
            region: String::new(),
        });
    }
    out.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(out)
}

#[tauri::command]
pub async fn s3_buckets(state: State<'_, AppState>) -> R<Vec<Bucket>> {
    let (region, profile) = state.rp();
    e(buckets_inner(&region, &profile).await)
}

#[tauri::command]
pub async fn s3_list(state: State<'_, AppState>, bucket: String, prefix: String) -> R<S3Listing> {
    let (region, profile) = state.rp();
    let mut args = vec![
        "s3api", "list-objects-v2",
        "--bucket", &bucket,
        "--delimiter", "/",
        "--max-keys", "500",
    ];
    if !prefix.is_empty() {
        args.push("--prefix");
        args.push(&prefix);
    }
    let v = run_json(&region, &profile, &args).await.map_err(|x| x.to_string())?;
    let folders: Vec<String> = arr(&v, "CommonPrefixes")
        .iter()
        .filter_map(|p| p.get("Prefix").and_then(|x| x.as_str()).map(String::from))
        .collect();
    let objects: Vec<S3Object> = arr(&v, "Contents")
        .iter()
        .filter(|o| gs(o, "Key") != prefix) // skip the folder placeholder itself
        .map(|o| S3Object {
            key: gs(o, "Key"),
            size: gi(o, "Size"),
            last_modified: gs(o, "LastModified"),
            storage_class: gs(o, "StorageClass"),
        })
        .collect();
    Ok(S3Listing {
        prefix,
        folders,
        objects,
        truncated: gb(&v, "IsTruncated"),
    })
}

// ============================================================
// RDS
// ============================================================

async fn rds_inner(region: &str, profile: &str) -> anyhow::Result<Vec<RdsInstance>> {
    let v = run_json(region, profile, &["rds", "describe-db-instances"]).await?;
    let mut out = vec![];
    for d in arr(&v, "DBInstances") {
        let endpoint = d.get("Endpoint").map(|e| gs(e, "Address")).unwrap_or_default();
        out.push(RdsInstance {
            id: gs(d, "DBInstanceIdentifier"),
            engine: gs(d, "Engine"),
            version: gs(d, "EngineVersion"),
            status: gs(d, "DBInstanceStatus"),
            class: gs(d, "DBInstanceClass"),
            storage_gb: gi(d, "AllocatedStorage"),
            endpoint,
            multi_az: gb(d, "MultiAZ"),
            publicly_accessible: gb(d, "PubliclyAccessible"),
        });
    }
    out.sort_by(|a, b| a.id.cmp(&b.id));
    Ok(out)
}

#[tauri::command]
pub async fn rds_instances(state: State<'_, AppState>) -> R<Vec<RdsInstance>> {
    let (region, profile) = state.rp();
    e(rds_inner(&region, &profile).await)
}

// ============================================================
// CloudWatch metric series (sparklines)
// ============================================================

#[tauri::command]
pub async fn metric_series(
    state: State<'_, AppState>,
    namespace: String,
    metric: String,
    dims: Vec<Vec<String>>,
    stat: String,
    minutes: i64,
    period: i64,
) -> R<Vec<MetricPoint>> {
    let (region, profile) = state.rp();
    let now = Utc::now();
    let start = now - chrono::Duration::minutes(minutes.max(1));
    let start_s = start.format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let end_s = now.format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let period_s = period.max(60).to_string();

    let mut args = vec![
        "cloudwatch", "get-metric-statistics",
        "--namespace", &namespace,
        "--metric-name", &metric,
        "--start-time", &start_s,
        "--end-time", &end_s,
        "--period", &period_s,
        "--statistics", &stat,
    ];
    // Dimensions as CLI shorthand tokens: Name=X,Value=Y
    let dim_tokens: Vec<String> = dims
        .iter()
        .filter(|d| d.len() == 2)
        .map(|d| format!("Name={},Value={}", d[0], d[1]))
        .collect();
    if !dim_tokens.is_empty() {
        args.push("--dimensions");
        for t in &dim_tokens {
            args.push(t.as_str());
        }
    }

    let v = run_json(&region, &profile, &args).await.map_err(|x| x.to_string())?;
    let mut pts: Vec<MetricPoint> = arr(&v, "Datapoints")
        .iter()
        .map(|d| MetricPoint {
            t: gs(d, "Timestamp"),
            v: d.get(&stat).and_then(|x| x.as_f64()).unwrap_or(0.0),
        })
        .collect();
    pts.sort_by(|a, b| a.t.cmp(&b.t));
    Ok(pts)
}

// ============================================================
// Overview — aggregate health snapshot
// ============================================================

#[tauri::command]
pub async fn overview(state: State<'_, AppState>) -> R<Overview> {
    let (region, profile) = state.rp();
    let mut errors: Vec<String> = vec![];

    // Top-level sections run concurrently.
    let (clusters_r, alarms_r, rds_r, lambdas_r, buckets_r) = tokio::join!(
        ecs_clusters_inner(&region, &profile),
        alarms_inner(&region, &profile),
        rds_inner(&region, &profile),
        lambda_inner(&region, &profile),
        buckets_inner(&region, &profile),
    );

    let mut services: Vec<EcsService> = vec![];
    match clusters_r {
        Ok(clusters) => {
            for c in &clusters {
                match ecs_services_inner(&region, &profile, &c.name).await {
                    Ok(mut svcs) => services.append(&mut svcs),
                    Err(err) => errors.push(format!("ECS services ({}): {err}", c.name)),
                }
            }
        }
        Err(err) => errors.push(format!("ECS clusters: {err}")),
    }

    let alarms_all = alarms_r.unwrap_or_else(|err| {
        errors.push(format!("Alarms: {err}"));
        vec![]
    });
    let alarms_total = alarms_all.len() as i64;
    let alarms_firing: Vec<Alarm> = alarms_all.into_iter().filter(|a| a.state == "ALARM").collect();

    let rds = rds_r.unwrap_or_else(|err| {
        errors.push(format!("RDS: {err}"));
        vec![]
    });
    let lambda_count = lambdas_r.map(|l| l.len() as i64).unwrap_or_else(|err| {
        errors.push(format!("Lambda: {err}"));
        0
    });
    let bucket_count = buckets_r.map(|b| b.len() as i64).unwrap_or_else(|err| {
        errors.push(format!("S3: {err}"));
        0
    });

    Ok(Overview {
        services,
        alarms_firing,
        rds,
        lambda_count,
        bucket_count,
        alarms_total,
        errors,
    })
}
