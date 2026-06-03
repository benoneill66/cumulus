import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import type { RdsInstance, MetricPoint } from "../lib/types";
import { Empty, LoadingRows, Sparkline, StatusDot, CopyBtn } from "../components/ui";
import { Icon } from "../lib/icons";
import { envOf } from "../lib/format";

function Metric({ id, metric, stat, color, unit, label, transform }: { id: string; metric: string; stat: string; color: string; unit: string; label: string; transform?: (v: number) => number }) {
  const m = useAsync<MetricPoint[]>(() => api.metricSeries("AWS/RDS", metric, [["DBInstanceIdentifier", id]], stat, 180, 300), [id, metric]);
  const pts = (m.data ?? []).map((p) => ({ t: p.t, v: transform ? transform(p.v) : p.v }));
  const latest = pts.length ? pts[pts.length - 1].v : null;
  return (
    <div className="glass-card" style={{ padding: "12px 13px", flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span className="label">{label}</span>
        <span className="mono" style={{ fontSize: 14, fontWeight: 680, color }}>{latest != null ? `${latest.toFixed(unit === "%" ? 1 : 0)}${unit}` : "—"}</span>
      </div>
      <Sparkline points={pts} color={color} max={unit === "%" ? 100 : undefined} />
    </div>
  );
}

function InstanceCard({ r }: { r: RdsInstance }) {
  const env = envOf(r.id);
  return (
    <div className="glass-card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div className="tile-glyph" style={{ width: 42, height: 42, background: "linear-gradient(140deg, rgba(52,226,160,0.2), rgba(52,226,160,0.06))", border: "1px solid rgba(52,226,160,0.3)", color: "var(--ok)" }}>
          <Icon.database />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 15.5, fontWeight: 700 }}>{r.id}</span>
            {env && <span className="chip" style={{ padding: "1px 8px", color: env.tone, borderColor: `${env.tone}44`, background: `${env.tone}14` }}>{env.label}</span>}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{r.engine} {r.version} · {r.class} · {r.storage_gb} GB{r.multi_az ? " · Multi-AZ" : ""}</div>
        </div>
        <span className="chip" style={{ color: r.status === "available" ? "var(--ok)" : "var(--alert)", borderColor: "transparent", background: "rgba(255,255,255,0.05)" }}>
          <StatusDot status={r.status} /> {r.status}
        </span>
      </div>

      {/* endpoint */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.25)", borderRadius: 11, padding: "9px 12px" }}>
        <Icon.external w={14} />
        <span className="mono" style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--muted)" }}>{r.endpoint || "no endpoint"}</span>
        {r.endpoint && <CopyBtn text={r.endpoint} />}
        {r.publicly_accessible && <span className="chip" style={{ color: "var(--alert)", fontSize: 10.5 }}>public</span>}
      </div>

      {/* metrics */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Metric id={r.id} metric="CPUUtilization" stat="Average" color="var(--accent)" unit="%" label="CPU" />
        <Metric id={r.id} metric="DatabaseConnections" stat="Average" color="var(--accent-3)" unit="" label="Connections" />
        <Metric id={r.id} metric="FreeableMemory" stat="Average" color="var(--ok)" unit=" MB" label="Free memory" transform={(v) => v / 1048576} />
        <Metric id={r.id} metric="FreeStorageSpace" stat="Average" color="var(--alert)" unit=" GB" label="Free storage" transform={(v) => v / 1073741824} />
      </div>
    </div>
  );
}

export function Database({ refreshKey }: { refreshKey: number }) {
  const rds = useAsync(() => api.rdsInstances(), [refreshKey], 30);

  if (rds.initial) return <LoadingRows rows={3} />;
  if (rds.error) return <Empty title="Couldn't list databases" sub={rds.error} icon={<Icon.alert w={26} />} />;
  if (!rds.data?.length) return <Empty title="No RDS databases" sub="None in this region/profile." icon={<Icon.database />} />;

  return (
    <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {rds.data.map((r) => <InstanceCard key={r.id} r={r} />)}
    </div>
  );
}
