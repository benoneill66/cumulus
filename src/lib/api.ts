import type {
  Settings, Identity, EcsCluster, EcsService, LambdaFn, InvokeResult,
  Alarm, LogGroup, LogEvent, Bucket, S3Listing, RdsInstance, MetricPoint, Overview,
} from "./types";
import * as demo from "./demo";

export const IS_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const mod = await import("@tauri-apps/api/core");
  return mod.invoke<T>(cmd, args);
}

// Outside the native app there is no AWS CLI to shell out to, so the browser
// preview serves fictional demo data (see demo.ts) — every screen is populated
// without credentials, and screenshots never expose a real account.
const wait = <T>(v: T, ms = 240): Promise<T> => new Promise((r) => setTimeout(() => r(v), ms));

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
    IS_TAURI ? invoke("get_settings") : Promise.resolve({ region: "us-east-1", profile: "default", refresh_secs: 30 }),
  saveSettings: (settings: Settings): Promise<void> =>
    IS_TAURI ? invoke("save_settings", { settings }) : Promise.resolve(),
  listProfiles: (): Promise<string[]> =>
    IS_TAURI ? invoke("list_profiles") : Promise.resolve(["default", "staging", "prod"]),
  listRegions: (): Promise<string[]> =>
    IS_TAURI ? invoke("list_regions") : Promise.resolve(["us-east-1", "us-west-2", "eu-west-1", "eu-central-1"]),
  checkAuth: (): Promise<Identity> =>
    IS_TAURI ? invoke("check_auth") : Promise.resolve(demo.demoIdentity),
  ssoLogin: (): Promise<string> => (IS_TAURI ? invoke("sso_login") : wait("Signed in (demo).")),

  overview: (): Promise<Overview> =>
    IS_TAURI ? invoke("overview") : wait(demo.demoOverview()),

  ecsClusters: (): Promise<EcsCluster[]> => (IS_TAURI ? invoke("ecs_clusters") : wait(demo.demoClusters)),
  ecsServices: (cluster: string): Promise<EcsService[]> => (IS_TAURI ? invoke("ecs_services", { cluster }) : wait(demo.demoServicesByCluster[cluster] ?? [])),
  ecsRestart: (cluster: string, service: string): Promise<string> => (IS_TAURI ? invoke("ecs_restart_service", { cluster, service }) : wait(`Forced a new deployment of ${service}.`)),
  ecsScale: (cluster: string, service: string, desired: number): Promise<string> => (IS_TAURI ? invoke("ecs_scale_service", { cluster, service, desired }) : wait(`Set ${service} desired count to ${desired}.`)),

  lambdaFunctions: (): Promise<LambdaFn[]> => (IS_TAURI ? invoke("lambda_functions") : wait(demo.demoLambda)),
  lambdaInvoke: (name: string, payload: string): Promise<InvokeResult> => (IS_TAURI ? invoke("lambda_invoke", { name, payload }) : wait(demo.demoInvoke, 600)),

  alarms: (): Promise<Alarm[]> => (IS_TAURI ? invoke("alarms") : wait(demo.demoAlarms)),

  logGroups: (): Promise<LogGroup[]> => (IS_TAURI ? invoke("log_groups") : wait(demo.demoLogGroups)),
  logTail: (group: string, minutes: number, filter: string): Promise<LogEvent[]> =>
    IS_TAURI ? invoke("log_tail", { group, minutes, filter })
      : wait(demo.demoLogEvents(group).filter((e) => !filter || e.message.toLowerCase().includes(filter.toLowerCase()))),

  s3Buckets: (): Promise<Bucket[]> => (IS_TAURI ? invoke("s3_buckets") : wait(demo.demoBuckets)),
  s3List: (bucket: string, prefix: string): Promise<S3Listing> =>
    IS_TAURI ? invoke("s3_list", { bucket, prefix }) : wait(demo.demoS3Listing(bucket, prefix)),

  rdsInstances: (): Promise<RdsInstance[]> => (IS_TAURI ? invoke("rds_instances") : wait(demo.demoRds)),

  metricSeries: (namespace: string, metric: string, dims: string[][], stat: string, minutes: number, period: number): Promise<MetricPoint[]> =>
    IS_TAURI ? invoke("metric_series", { namespace, metric, dims, stat, minutes, period }) : wait(demo.demoMetric(metric)),
};
