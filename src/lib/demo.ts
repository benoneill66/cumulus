// Demo data shown when Cumulus runs outside the native app (browser preview),
// so the UI is fully populated without AWS credentials — and so screenshots
// never expose a real account. All names/IDs here are fictional.

import type {
  Identity, EcsCluster, EcsService, LambdaFn, Alarm, LogGroup, LogEvent,
  Bucket, S3Listing, RdsInstance, MetricPoint, Overview, InvokeResult,
} from "./types";

export const demoIdentity: Identity = {
  ok: true,
  account: "123456789012",
  arn: "arn:aws:sts::123456789012:assumed-role/Admin/demo",
  user_id: "AROAEXAMPLE:demo",
  profile: "default",
  region: "us-east-1",
  error: "",
};

function svc(cluster: string, name: string, desired: number, running: number, health: EcsService["health"], pending = 0): EcsService {
  return {
    name, arn: `arn:aws:ecs:us-east-1:123456789012:service/${cluster}/${name}`,
    cluster, status: health === "stopped" ? "DRAINING" : "ACTIVE",
    desired, running, pending,
    launch_type: "FARGATE",
    task_def: `${name.replace(/-service$/, "")}:${40 + (name.length % 12)}`,
    health,
    deployments: health === "deploying"
      ? [
          { status: "PRIMARY", desired, running: running - 1, pending: 1, failed: 0, rollout_state: "IN_PROGRESS", created_at: new Date(Date.now() - 90_000).toISOString() },
          { status: "ACTIVE", desired: 1, running: 1, pending: 0, failed: 0, rollout_state: "COMPLETED", created_at: new Date(Date.now() - 3_600_000).toISOString() },
        ]
      : [{ status: "PRIMARY", desired, running, pending, failed: health === "degraded" ? 2 : 0, rollout_state: "COMPLETED", created_at: new Date(Date.now() - 6 * 3_600_000).toISOString() }],
    events: [
      { created_at: new Date(Date.now() - 120_000).toISOString(), message: `(service ${name}) has reached a steady state.` },
      { created_at: new Date(Date.now() - 95_000).toISOString(), message: `(service ${name}) registered 1 targets in target-group tg-${name}` },
      { created_at: new Date(Date.now() - 600_000).toISOString(), message: `(service ${name}) has started 1 tasks: (task 3f9a1c).` },
    ],
  };
}

export const demoServicesByCluster: Record<string, EcsService[]> = {
  "web-prod-cluster": [
    svc("web-prod-cluster", "storefront-prod-service", 4, 4, "healthy"),
    svc("web-prod-cluster", "checkout-prod-service", 3, 2, "degraded"),
    svc("web-prod-cluster", "worker-prod-service", 2, 2, "healthy"),
    svc("web-prod-cluster", "search-prod-service", 2, 2, "deploying", 1),
  ],
  "web-staging-cluster": [
    svc("web-staging-cluster", "storefront-stage-service", 1, 1, "healthy"),
    svc("web-staging-cluster", "checkout-stage-service", 1, 1, "healthy"),
    svc("web-staging-cluster", "worker-stage-service", 1, 0, "stopped"),
  ],
};

export const demoClusters: EcsCluster[] = [
  { name: "web-prod-cluster", arn: "arn:aws:ecs:us-east-1:123456789012:cluster/web-prod-cluster", status: "ACTIVE", services_count: 4, running_tasks: 10, pending_tasks: 1 },
  { name: "web-staging-cluster", arn: "arn:aws:ecs:us-east-1:123456789012:cluster/web-staging-cluster", status: "ACTIVE", services_count: 3, running_tasks: 2, pending_tasks: 0 },
];

export const demoLambda: LambdaFn[] = [
  { name: "stripe-webhook-prod", runtime: "nodejs20.x", memory: 256, timeout: 30, code_size: 4_812_544, last_modified: new Date(Date.now() - 3 * 86400000).toISOString(), description: "Handles Stripe webhook events", handler: "index.handler", state: "Active" },
  { name: "image-resizer", runtime: "nodejs20.x", memory: 1024, timeout: 60, code_size: 18_204_113, last_modified: new Date(Date.now() - 9 * 86400000).toISOString(), description: "Resizes uploaded images to thumbnails", handler: "resize.main", state: "Active" },
  { name: "nightly-report", runtime: "python3.12", memory: 512, timeout: 300, code_size: 2_104_882, last_modified: new Date(Date.now() - 21 * 86400000).toISOString(), description: "Generates the nightly revenue report", handler: "report.handler", state: "Active" },
  { name: "order-fulfilment", runtime: "python3.12", memory: 512, timeout: 120, code_size: 6_551_201, last_modified: new Date(Date.now() - 2 * 86400000).toISOString(), description: "Dispatches orders to the 3PL", handler: "app.lambda_handler", state: "Active" },
];

export const demoAlarms: Alarm[] = [
  { name: "API 5xx error rate", state: "ALARM", reason: "Threshold Crossed: 1 datapoint (3.4) was greater than the threshold (1.0).", metric: "5XXError", namespace: "AWS/ApplicationELB", updated: new Date(Date.now() - 240_000).toISOString(), actions_enabled: true },
  { name: "Checkout service CPU high", state: "ALARM", reason: "Threshold Crossed: CPUUtilization (88.2) > 85.0 for 3 datapoints.", metric: "CPUUtilization", namespace: "AWS/ECS", updated: new Date(Date.now() - 600_000).toISOString(), actions_enabled: true },
  { name: "RDS free storage low", state: "OK", reason: "Threshold not crossed.", metric: "FreeStorageSpace", namespace: "AWS/RDS", updated: new Date(Date.now() - 5 * 3_600_000).toISOString(), actions_enabled: true },
  { name: "Worker queue depth", state: "OK", reason: "Threshold not crossed.", metric: "ApproximateNumberOfMessagesVisible", namespace: "AWS/SQS", updated: new Date(Date.now() - 2 * 3_600_000).toISOString(), actions_enabled: true },
  { name: "Storefront target health", state: "OK", reason: "Threshold not crossed.", metric: "UnHealthyHostCount", namespace: "AWS/ApplicationELB", updated: new Date(Date.now() - 8 * 3_600_000).toISOString(), actions_enabled: true },
  { name: "Nightly report duration", state: "INSUFFICIENT_DATA", reason: "Insufficient data for the metric.", metric: "Duration", namespace: "AWS/Lambda", updated: new Date(Date.now() - 13 * 3_600_000).toISOString(), actions_enabled: false },
];

export const demoLogGroups: LogGroup[] = [
  { name: "/ecs/storefront-prod", stored_bytes: 1_842_201_233, retention_days: 30 },
  { name: "/ecs/checkout-prod", stored_bytes: 942_201_233, retention_days: 30 },
  { name: "/ecs/worker-prod", stored_bytes: 3_142_201_233, retention_days: 14 },
  { name: "/aws/lambda/stripe-webhook-prod", stored_bytes: 88_201_233, retention_days: 0 },
  { name: "/aws/lambda/image-resizer", stored_bytes: 412_201_233, retention_days: 0 },
  { name: "/ecs/storefront-stage", stored_bytes: 142_201_233, retention_days: 7 },
];

const LOG_LINES: { lvl: string; msg: string }[] = [
  { lvl: "info", msg: "GET /api/v1/products 200 12ms" },
  { lvl: "info", msg: "POST /api/v1/cart/items 201 31ms" },
  { lvl: "info", msg: "GET /api/v1/products/sku-8841 200 8ms" },
  { lvl: "warn", msg: "slow query (412ms): SELECT * FROM orders WHERE status = 'pending'" },
  { lvl: "info", msg: "POST /api/v1/checkout/session 200 88ms" },
  { lvl: "info", msg: "worker: processed job send-receipt-email in 240ms" },
  { lvl: "error", msg: "Stripe API timeout after 5000ms — retrying (attempt 2/3)" },
  { lvl: "info", msg: "GET /healthz 200 1ms" },
  { lvl: "info", msg: "cache hit: product:sku-8841 (ttl 280s)" },
  { lvl: "warn", msg: "rate limit approaching for ip 10.0.4.22 (118/120)" },
  { lvl: "info", msg: "POST /api/v1/webhooks/stripe 200 19ms" },
  { lvl: "info", msg: "worker: enqueued thumbnail-generate for upload 9f21" },
];

export function demoLogEvents(group: string): LogEvent[] {
  const stream = group.includes("lambda") ? "2026/06/03/[$LATEST]a1b2c3" : "ecs/app/3f9a1c2b";
  const out: LogEvent[] = [];
  const now = Date.now();
  for (let i = 0; i < 60; i++) {
    const l = LOG_LINES[(i * 7 + group.length) % LOG_LINES.length];
    out.push({ timestamp: now - (60 - i) * 9000 - (i % 3) * 1500, message: l.msg, stream });
  }
  return out;
}

export const demoBuckets: Bucket[] = [
  { name: "acme-assets-prod", created: new Date(Date.now() - 540 * 86400000).toISOString(), region: "" },
  { name: "acme-user-uploads", created: new Date(Date.now() - 410 * 86400000).toISOString(), region: "" },
  { name: "acme-db-backups", created: new Date(Date.now() - 690 * 86400000).toISOString(), region: "" },
  { name: "acme-logs-archive", created: new Date(Date.now() - 300 * 86400000).toISOString(), region: "" },
  { name: "acme-static-site", created: new Date(Date.now() - 120 * 86400000).toISOString(), region: "" },
  { name: "acme-terraform-state", created: new Date(Date.now() - 800 * 86400000).toISOString(), region: "" },
];

export function demoS3Listing(_bucket: string, prefix: string): S3Listing {
  if (!prefix) {
    return {
      prefix,
      folders: ["images/", "videos/", "exports/", "thumbnails/"],
      objects: [
        { key: "index.html", size: 14_882, last_modified: new Date(Date.now() - 86400000).toISOString(), storage_class: "STANDARD" },
        { key: "manifest.json", size: 2_104, last_modified: new Date(Date.now() - 2 * 86400000).toISOString(), storage_class: "STANDARD" },
        { key: "favicon.ico", size: 33_204, last_modified: new Date(Date.now() - 40 * 86400000).toISOString(), storage_class: "STANDARD" },
      ],
      truncated: false,
    };
  }
  return {
    prefix,
    folders: [],
    objects: Array.from({ length: 8 }).map((_, i) => ({
      key: `${prefix}asset-${1000 + i}.webp`,
      size: 80_000 + i * 24_500,
      last_modified: new Date(Date.now() - (i + 1) * 3_600_000).toISOString(),
      storage_class: "STANDARD",
    })),
    truncated: false,
  };
}

export const demoRds: RdsInstance[] = [
  { id: "acme-prod-postgres", engine: "postgres", version: "16.3", status: "available", class: "db.r6g.xlarge", storage_gb: 200, endpoint: "acme-prod-postgres.abc123.us-east-1.rds.amazonaws.com", multi_az: true, publicly_accessible: false },
  { id: "acme-analytics-mysql", engine: "mysql", version: "8.0.36", status: "available", class: "db.t3.large", storage_gb: 100, endpoint: "acme-analytics-mysql.abc123.us-east-1.rds.amazonaws.com", multi_az: false, publicly_accessible: false },
];

export function demoMetric(metric: string): MetricPoint[] {
  const now = Date.now();
  const n = 32;
  const cfg: Record<string, { base: number; amp: number; freq: number; noise: number }> = {
    CPUUtilization: { base: 46, amp: 22, freq: 0.5, noise: 6 },
    MemoryUtilization: { base: 58, amp: 10, freq: 0.3, noise: 3 },
    Invocations: { base: 40, amp: 35, freq: 0.7, noise: 12 },
    Errors: { base: 0.4, amp: 0.6, freq: 1.1, noise: 0.5 },
    DatabaseConnections: { base: 28, amp: 12, freq: 0.4, noise: 4 },
    FreeableMemory: { base: 6 * 1073741824, amp: 0.6 * 1073741824, freq: 0.35, noise: 0.1 * 1073741824 },
    FreeStorageSpace: { base: 120 * 1073741824, amp: 4 * 1073741824, freq: 0.15, noise: 0.5 * 1073741824 },
  };
  const c = cfg[metric] ?? { base: 50, amp: 15, freq: 0.5, noise: 5 };
  return Array.from({ length: n }).map((_, i) => {
    const wobble = Math.sin(i * c.freq) * c.amp + (Math.sin(i * 1.7) * 0.5 + 0.5) * c.noise;
    let v = c.base + wobble;
    if (metric === "Errors") v = Math.max(0, Math.round(v));
    if (metric === "Invocations" || metric === "DatabaseConnections") v = Math.max(0, Math.round(v));
    return { t: new Date(now - (n - i) * 300_000).toISOString(), v: Math.max(0, v) };
  });
}

export function demoOverview(): Overview {
  const services = Object.values(demoServicesByCluster).flat();
  return {
    services,
    alarms_firing: demoAlarms.filter((a) => a.state === "ALARM"),
    rds: demoRds,
    lambda_count: demoLambda.length,
    bucket_count: demoBuckets.length,
    alarms_total: demoAlarms.length,
    errors: [],
  };
}

export const demoInvoke: InvokeResult = {
  ok: true,
  status_code: 200,
  function_error: "",
  payload: JSON.stringify({ statusCode: 200, body: { ok: true, processed: 1, id: "evt_1Nf8x2" } }, null, 0),
  log_tail: "START RequestId: a1b2c3d4 Version: $LATEST\n2026-06-03T22:14:01 INFO  handling event\n2026-06-03T22:14:01 INFO  done in 42ms\nEND RequestId: a1b2c3d4\nREPORT Duration: 42.18 ms  Billed Duration: 43 ms  Memory Size: 256 MB  Max Memory Used: 88 MB",
  duration_note: "",
};
