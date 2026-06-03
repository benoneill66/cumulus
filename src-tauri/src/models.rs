//! Serde structs returned to the React frontend. Field names are snake_case and
//! mirror the TypeScript types in `src/lib/types.ts`.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub region: String,
    pub profile: String,
    pub refresh_secs: u32,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            region: "eu-west-1".into(),
            profile: "default".into(),
            refresh_secs: 30,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct Identity {
    pub ok: bool,
    pub account: String,
    pub arn: String,
    pub user_id: String,
    pub profile: String,
    pub region: String,
    pub error: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct MetricPoint {
    pub t: String,
    pub v: f64,
}

// ---------- ECS ----------

#[derive(Debug, Clone, Serialize)]
pub struct EcsCluster {
    pub name: String,
    pub arn: String,
    pub status: String,
    pub services_count: i64,
    pub running_tasks: i64,
    pub pending_tasks: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct EcsDeployment {
    pub status: String,
    pub desired: i64,
    pub running: i64,
    pub pending: i64,
    pub failed: i64,
    pub rollout_state: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct EcsEvent {
    pub created_at: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct EcsService {
    pub name: String,
    pub arn: String,
    pub cluster: String,
    pub status: String,
    pub desired: i64,
    pub running: i64,
    pub pending: i64,
    pub launch_type: String,
    pub task_def: String,
    pub deployments: Vec<EcsDeployment>,
    pub events: Vec<EcsEvent>,
    /// "healthy" | "deploying" | "degraded" | "stopped"
    pub health: String,
}

// ---------- Lambda ----------

#[derive(Debug, Clone, Serialize)]
pub struct LambdaFn {
    pub name: String,
    pub runtime: String,
    pub memory: i64,
    pub timeout: i64,
    pub code_size: i64,
    pub last_modified: String,
    pub description: String,
    pub handler: String,
    pub state: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct InvokeResult {
    pub ok: bool,
    pub status_code: i64,
    pub function_error: String,
    pub payload: String,
    pub log_tail: String,
    pub duration_note: String,
}

// ---------- CloudWatch alarms ----------

#[derive(Debug, Clone, Serialize)]
pub struct Alarm {
    pub name: String,
    pub state: String, // OK | ALARM | INSUFFICIENT_DATA
    pub reason: String,
    pub metric: String,
    pub namespace: String,
    pub updated: String,
    pub actions_enabled: bool,
}

// ---------- Logs ----------

#[derive(Debug, Clone, Serialize)]
pub struct LogGroup {
    pub name: String,
    pub stored_bytes: i64,
    pub retention_days: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct LogEvent {
    pub timestamp: i64,
    pub message: String,
    pub stream: String,
}

// ---------- S3 ----------

#[derive(Debug, Clone, Serialize)]
pub struct Bucket {
    pub name: String,
    pub created: String,
    pub region: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct S3Object {
    pub key: String,
    pub size: i64,
    pub last_modified: String,
    pub storage_class: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct S3Listing {
    pub prefix: String,
    pub folders: Vec<String>,
    pub objects: Vec<S3Object>,
    pub truncated: bool,
}

// ---------- RDS ----------

#[derive(Debug, Clone, Serialize)]
pub struct RdsInstance {
    pub id: String,
    pub engine: String,
    pub version: String,
    pub status: String,
    pub class: String,
    pub storage_gb: i64,
    pub endpoint: String,
    pub multi_az: bool,
    pub publicly_accessible: bool,
}

// ---------- Overview ----------

#[derive(Debug, Clone, Serialize)]
pub struct Overview {
    pub services: Vec<EcsService>,
    pub alarms_firing: Vec<Alarm>,
    pub rds: Vec<RdsInstance>,
    pub lambda_count: i64,
    pub bucket_count: i64,
    pub alarms_total: i64,
    pub errors: Vec<String>,
}
