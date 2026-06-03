import type { Overview as OverviewData } from "../lib/types";
import type { ViewId } from "../components/Sidebar";
import { HealthBadge, AlarmBadge, RatioBar, Empty, LoadingRows, StatusDot } from "../components/ui";
import { Icon } from "../lib/icons";
import { envOf, ago } from "../lib/format";

function Stat({ label, value, sub, tone = "var(--text)", icon, onClick }: { label: string; value: React.ReactNode; sub?: string; tone?: string; icon?: React.ReactNode; onClick?: () => void }) {
  return (
    <div className={`glass-card ${onClick ? "tile" : ""}`} style={{ padding: "16px 18px", flex: 1, minWidth: 0 }} onClick={onClick}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span className="label">{label}</span>
        <span style={{ color: "var(--muted)", opacity: 0.7, display: "flex" }}>{icon}</span>
      </div>
      <div className="stat-num" style={{ color: tone }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export function Overview({ data, loading, error, setView }: { data: OverviewData | null; loading: boolean; error: string | null; setView: (v: ViewId) => void }) {
  if (loading && !data) return <LoadingRows rows={5} />;
  if (error && !data) return <Empty title="Couldn't reach AWS" sub={error} icon={<Icon.alert w={26} />} />;
  if (!data) return null;

  const healthy = data.services.filter((s) => s.health === "healthy").length;
  const total = data.services.length;
  const allHealthy = total > 0 && healthy === total;
  const firing = data.alarms_firing.length;

  return (
    <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* stat row */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Stat label="ECS services" value={total ? `${healthy}/${total}` : "—"} sub={total ? (allHealthy ? "all healthy" : "needs attention") : "no services"}
          tone={allHealthy ? "var(--ok)" : total ? "var(--alert)" : "var(--text)"} icon={<Icon.ecs />} onClick={() => setView("ecs")} />
        <Stat label="Alarms firing" value={firing} sub={`${data.alarms_total} configured`}
          tone={firing ? "var(--error)" : "var(--ok)"} icon={<Icon.alarms />} onClick={() => setView("alarms")} />
        <Stat label="Lambda" value={data.lambda_count} sub="functions" icon={<Icon.lambda />} onClick={() => setView("lambda")} />
        <Stat label="Databases" value={data.rds.length} sub={data.rds.every((r) => r.status === "available") ? "all available" : "check status"}
          tone={data.rds.length && data.rds.every((r) => r.status === "available") ? "var(--ok)" : "var(--text)"} icon={<Icon.database />} onClick={() => setView("database")} />
        <Stat label="S3 buckets" value={data.bucket_count} sub="storage" icon={<Icon.storage />} onClick={() => setView("storage")} />
      </div>

      {/* alarms firing — prominent */}
      {firing > 0 && (
        <div className="glass-card rise" style={{ padding: "16px 18px", border: "1px solid rgba(255,93,122,0.35)", background: "linear-gradient(180deg, rgba(255,93,122,0.10), rgba(255,93,122,0.03))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
            <span style={{ color: "var(--error)", display: "flex" }}><Icon.alert w={17} /></span>
            <span style={{ fontWeight: 680, fontSize: 14 }}>{firing} alarm{firing > 1 ? "s" : ""} firing</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.alarms_firing.map((a) => (
              <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <AlarmBadge state={a.state} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.reason}</div>
                </div>
                <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>{ago(a.updated)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ECS services grid */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 2px" }}>
          <div style={{ fontSize: 13.5, fontWeight: 680 }}>Services</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setView("ecs")}>Manage <Icon.chevron w={14} /></button>
        </div>
        {total === 0 ? (
          <Empty title="No ECS services" sub="Nothing running in this region/profile." icon={<Icon.ecs />} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {data.services.map((s) => {
              const env = envOf(`${s.cluster} ${s.name}`);
              return (
                <div key={s.arn} className="glass-card tile" style={{ padding: "14px 15px" }} onClick={() => setView("ecs")}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                    {env && <span className="chip" style={{ padding: "1px 8px", color: env.tone, borderColor: `${env.tone}44`, background: `${env.tone}14` }}>{env.label}</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 12 }}>{s.cluster}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <HealthBadge health={s.health} />
                    <span className="mono" style={{ fontSize: 12.5, color: "var(--muted)" }}>
                      <span style={{ color: "var(--text)", fontWeight: 650 }}>{s.running}</span>/{s.desired} tasks
                    </span>
                  </div>
                  <RatioBar running={s.running} desired={s.desired} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RDS row */}
      {data.rds.length > 0 && (
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 680, marginBottom: 10, padding: "0 2px" }}>Databases</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.rds.map((r) => (
              <div key={r.id} className="glass-card tile" style={{ padding: "12px 15px", display: "flex", alignItems: "center", gap: 14 }} onClick={() => setView("database")}>
                <StatusDot status={r.status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.id}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{r.engine} {r.version} · {r.class}</div>
                </div>
                <span className="chip" style={{ color: r.status === "available" ? "var(--ok)" : "var(--alert)", borderColor: "transparent", background: "rgba(255,255,255,0.05)" }}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* non-fatal errors */}
      {data.errors.length > 0 && (
        <div className="glass-card" style={{ padding: "12px 15px", borderColor: "rgba(255,180,84,0.3)" }}>
          <div style={{ fontSize: 12, fontWeight: 650, color: "var(--alert)", marginBottom: 6, display: "flex", alignItems: "center", gap: 7 }}>
            <Icon.alert w={14} /> Some data couldn't load
          </div>
          {data.errors.map((e, i) => (
            <div key={i} style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5 }}>{e}</div>
          ))}
        </div>
      )}
    </div>
  );
}
