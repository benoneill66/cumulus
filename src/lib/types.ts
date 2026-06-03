// Mirror of the Rust structs in src-tauri/src/models.rs (snake_case).

export interface Settings {
  region: string;
  profile: string;
  refresh_secs: number;
}

export interface Identity {
  ok: boolean;
  account: string;
  arn: string;
  user_id: string;
  profile: string;
  region: string;
  error: string;
}

export interface MetricPoint {
  t: string;
  v: number;
}

export interface EcsCluster {
  name: string;
  arn: string;
  status: string;
  services_count: number;
  running_tasks: number;
  pending_tasks: number;
}

export interface EcsDeployment {
  status: string;
  desired: number;
  running: number;
  pending: number;
  failed: number;
  rollout_state: string;
  created_at: string;
}

export interface EcsEvent {
  created_at: string;
  message: string;
}

export interface EcsService {
  name: string;
  arn: string;
  cluster: string;
  status: string;
  desired: number;
  running: number;
  pending: number;
  launch_type: string;
  task_def: string;
  deployments: EcsDeployment[];
  events: EcsEvent[];
  health: "healthy" | "deploying" | "degraded" | "stopped";
}

export interface LambdaFn {
  name: string;
  runtime: string;
  memory: number;
  timeout: number;
  code_size: number;
  last_modified: string;
  description: string;
  handler: string;
  state: string;
}

export interface InvokeResult {
  ok: boolean;
  status_code: number;
  function_error: string;
  payload: string;
  log_tail: string;
  duration_note: string;
}

export interface Alarm {
  name: string;
  state: string;
  reason: string;
  metric: string;
  namespace: string;
  updated: string;
  actions_enabled: boolean;
}

export interface LogGroup {
  name: string;
  stored_bytes: number;
  retention_days: number;
}

export interface LogEvent {
  timestamp: number;
  message: string;
  stream: string;
}

export interface Bucket {
  name: string;
  created: string;
  region: string;
}

export interface S3Object {
  key: string;
  size: number;
  last_modified: string;
  storage_class: string;
}

export interface S3Listing {
  prefix: string;
  folders: string[];
  objects: S3Object[];
  truncated: boolean;
}

export interface RdsInstance {
  id: string;
  engine: string;
  version: string;
  status: string;
  class: string;
  storage_gb: number;
  endpoint: string;
  multi_az: boolean;
  publicly_accessible: boolean;
}

export interface Overview {
  services: EcsService[];
  alarms_firing: Alarm[];
  rds: RdsInstance[];
  lambda_count: number;
  bucket_count: number;
  alarms_total: number;
  errors: string[];
}
