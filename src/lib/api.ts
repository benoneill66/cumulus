import type {
  Settings, Identity, EcsCluster, EcsService, LambdaFn, InvokeResult,
  Alarm, LogGroup, LogEvent, Bucket, S3Listing, RdsInstance, MetricPoint, Overview,
} from "./types";

export const IS_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const mod = await import("@tauri-apps/api/core");
  return mod.invoke<T>(cmd, args);
}

// In the browser preview there is no AWS CLI to shell out to. Surface a clear
// "native only" signal rather than pretending; the views render an empty/auth
// state from it.
function notNative(): never {
  throw new Error("Cumulus talks to AWS through the native app — run `bun run app`.");
}

export async function startWindowDrag(e: React.MouseEvent) {
  if (!IS_TAURI || e.button !== 0) return;
  const INTERACTIVE = "button,input,select,textarea,a,[role='switch'],.no-drag";
  if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().startDragging();
}

export async function toggleMaximize() {
  if (!IS_TAURI) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().toggleMaximize();
}

export const api = {
  getSettings: (): Promise<Settings> =>
    IS_TAURI ? invoke("get_settings") : Promise.resolve({ region: "eu-west-1", profile: "default", refresh_secs: 30 }),
  saveSettings: (settings: Settings): Promise<void> =>
    IS_TAURI ? invoke("save_settings", { settings }) : Promise.resolve(),
  listProfiles: (): Promise<string[]> =>
    IS_TAURI ? invoke("list_profiles") : Promise.resolve(["default"]),
  listRegions: (): Promise<string[]> =>
    IS_TAURI ? invoke("list_regions") : Promise.resolve(["eu-west-1", "us-east-1"]),
  checkAuth: (): Promise<Identity> =>
    IS_TAURI ? invoke("check_auth") : Promise.resolve({ ok: false, account: "", arn: "", user_id: "", profile: "default", region: "eu-west-1", error: "Browser preview — run the native app." }),
  ssoLogin: (): Promise<string> => (IS_TAURI ? invoke("sso_login") : notNative()),

  overview: (): Promise<Overview> =>
    IS_TAURI ? invoke("overview") : Promise.resolve({ services: [], alarms_firing: [], rds: [], lambda_count: 0, bucket_count: 0, alarms_total: 0, errors: ["Browser preview — run the native app."] }),

  ecsClusters: (): Promise<EcsCluster[]> => (IS_TAURI ? invoke("ecs_clusters") : Promise.resolve([])),
  ecsServices: (cluster: string): Promise<EcsService[]> => (IS_TAURI ? invoke("ecs_services", { cluster }) : Promise.resolve([])),
  ecsRestart: (cluster: string, service: string): Promise<string> => (IS_TAURI ? invoke("ecs_restart_service", { cluster, service }) : notNative()),
  ecsScale: (cluster: string, service: string, desired: number): Promise<string> => (IS_TAURI ? invoke("ecs_scale_service", { cluster, service, desired }) : notNative()),

  lambdaFunctions: (): Promise<LambdaFn[]> => (IS_TAURI ? invoke("lambda_functions") : Promise.resolve([])),
  lambdaInvoke: (name: string, payload: string): Promise<InvokeResult> => (IS_TAURI ? invoke("lambda_invoke", { name, payload }) : notNative()),

  alarms: (): Promise<Alarm[]> => (IS_TAURI ? invoke("alarms") : Promise.resolve([])),

  logGroups: (): Promise<LogGroup[]> => (IS_TAURI ? invoke("log_groups") : Promise.resolve([])),
  logTail: (group: string, minutes: number, filter: string): Promise<LogEvent[]> =>
    IS_TAURI ? invoke("log_tail", { group, minutes, filter }) : Promise.resolve([]),

  s3Buckets: (): Promise<Bucket[]> => (IS_TAURI ? invoke("s3_buckets") : Promise.resolve([])),
  s3List: (bucket: string, prefix: string): Promise<S3Listing> =>
    IS_TAURI ? invoke("s3_list", { bucket, prefix }) : Promise.resolve({ prefix, folders: [], objects: [], truncated: false }),

  rdsInstances: (): Promise<RdsInstance[]> => (IS_TAURI ? invoke("rds_instances") : Promise.resolve([])),

  metricSeries: (namespace: string, metric: string, dims: string[][], stat: string, minutes: number, period: number): Promise<MetricPoint[]> =>
    IS_TAURI ? invoke("metric_series", { namespace, metric, dims, stat, minutes, period }) : Promise.resolve([]),
};
