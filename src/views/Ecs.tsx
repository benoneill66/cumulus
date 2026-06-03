import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import type { EcsService, MetricPoint } from "../lib/types";
import { HealthBadge, RatioBar, Empty, LoadingRows, Spinner, Dialog, Sparkline, toast } from "../components/ui";
import { Icon } from "../lib/icons";
import { envOf, ago } from "../lib/format";

function MetricCard({ title, points, color, unit, max }: { title: string; points: MetricPoint[]; color: string; unit: string; max?: number }) {
  const latest = points.length ? points[points.length - 1].v : null;
  return (
    <div className="glass-card" style={{ padding: "12px 13px", flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span className="label">{title}</span>
        <span className="mono" style={{ fontSize: 15, fontWeight: 680, color }}>{latest != null ? `${latest.toFixed(1)}${unit}` : "—"}</span>
      </div>
      <Sparkline points={points} color={color} max={max} />
    </div>
  );
}

function ServiceDrawer({ svc, cluster, onClose, onChanged }: { svc: EcsService; cluster: string; onClose: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState<"restart" | "scale" | null>(null);
  const [scaleOpen, setScaleOpen] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [desired, setDesired] = useState(svc.desired);

  const cpu = useAsync<MetricPoint[]>(() => api.metricSeries("AWS/ECS", "CPUUtilization", [["ClusterName", cluster], ["ServiceName", svc.name]], "Average", 180, 300), [svc.arn]);
  const mem = useAsync<MetricPoint[]>(() => api.metricSeries("AWS/ECS", "MemoryUtilization", [["ClusterName", cluster], ["ServiceName", svc.name]], "Average", 180, 300), [svc.arn]);

  async function restart() {
    setBusy("restart");
    try {
      const msg = await api.ecsRestart(cluster, svc.name);
      toast(msg, "ok");
      setConfirmRestart(false);
      onChanged();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setBusy(null);
    }
  }
  async function scale() {
    setBusy("scale");
    try {
      const msg = await api.ecsScale(cluster, svc.name, desired);
      toast(msg, "ok");
      setScaleOpen(false);
      onChanged();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="drawer-scrim no-drag" onClick={onClose} />
      <div className="drawer no-drag">
        <div style={{ padding: "20px 22px 14px", borderBottom: "1px solid var(--hair-soft)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 720, letterSpacing: "-0.02em" }}>{svc.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{cluster}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 7 }}><Icon.close /></button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
            <HealthBadge health={svc.health} />
            <span className="mono" style={{ fontSize: 13, color: "var(--muted)" }}>
              <span style={{ color: "var(--text)", fontWeight: 650 }}>{svc.running}</span>/{svc.desired} running
              {svc.pending > 0 && <span style={{ color: "var(--running)" }}> · {svc.pending} pending</span>}
            </span>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "16px 22px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-warn" disabled={!!busy} onClick={() => setConfirmRestart(true)} style={{ flex: 1, justifyContent: "center" }}>
              {busy === "restart" ? <Spinner size={14} /> : <Icon.restart />} Restart
            </button>
            <button className="btn" disabled={!!busy} onClick={() => { setDesired(svc.desired); setScaleOpen(true); }} style={{ flex: 1, justifyContent: "center" }}>
              <Icon.scale /> Scale
            </button>
          </div>

          {/* metrics */}
          <div style={{ display: "flex", gap: 12 }}>
            <MetricCard title="CPU" points={cpu.data ?? []} color="var(--accent)" unit="%" max={100} />
            <MetricCard title="Memory" points={mem.data ?? []} color="var(--accent-3)" unit="%" max={100} />
          </div>

          {/* meta */}
          <div className="glass-card" style={{ padding: "14px 16px" }}>
            <div className="meta-grid">
              <span className="k">Status</span><span className="v">{svc.status}</span>
              <span className="k">Launch type</span><span className="v">{svc.launch_type || "—"}</span>
              <span className="k">Task def</span><span className="v mono" style={{ fontSize: 12 }}>{svc.task_def}</span>
            </div>
          </div>

          {/* deployments */}
          {svc.deployments.length > 0 && (
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 680, marginBottom: 9 }}>Deployments</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {svc.deployments.map((d, i) => (
                  <div key={i} className="glass-card" style={{ padding: "11px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                    <span className={`dot ${d.rollout_state === "COMPLETED" ? "ok" : d.rollout_state === "FAILED" ? "error" : "deploying"}`} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{d.status} · {d.rollout_state || "—"}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{ago(d.created_at)}</div>
                    </div>
                    <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{d.running}/{d.desired}{d.failed > 0 ? ` · ${d.failed} failed` : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* events */}
          {svc.events.length > 0 && (
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 680, marginBottom: 9 }}>Recent events</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {svc.events.map((ev, i) => (
                  <div key={i} style={{ fontSize: 12, lineHeight: 1.5, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 10 }}>
                    <span style={{ color: "var(--muted)", whiteSpace: "nowrap", fontSize: 11 }}>{ago(ev.created_at)}</span>
                    <span style={{ color: "var(--text)", opacity: 0.9 }}>{ev.message.replace(/^\(service [^)]+\)\s*/, "")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmRestart && (
        <Dialog title="Restart service?" onClose={() => setConfirmRestart(false)}>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, marginTop: 0 }}>
            This forces a new deployment of <b style={{ color: "var(--text)" }}>{svc.name}</b>, replacing every task with a fresh one (rolling, zero-downtime if healthy).
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button className="btn btn-ghost" onClick={() => setConfirmRestart(false)} style={{ flex: 1, justifyContent: "center" }}>Cancel</button>
            <button className="btn btn-warn" disabled={!!busy} onClick={restart} style={{ flex: 1, justifyContent: "center" }}>
              {busy === "restart" ? <Spinner size={14} /> : <Icon.restart />} Restart now
            </button>
          </div>
        </Dialog>
      )}

      {scaleOpen && (
        <Dialog title={`Scale ${svc.name}`} onClose={() => setScaleOpen(false)}>
          <div className="label" style={{ marginBottom: 8 }}>Desired task count</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn" onClick={() => setDesired((d) => Math.max(0, d - 1))} style={{ padding: "8px 14px", fontSize: 17 }}>−</button>
            <input className="input mono" type="number" min={0} value={desired} onChange={(e) => setDesired(Math.max(0, parseInt(e.target.value) || 0))} style={{ textAlign: "center", fontSize: 18, fontWeight: 680 }} />
            <button className="btn" onClick={() => setDesired((d) => d + 1)} style={{ padding: "8px 14px", fontSize: 17 }}>+</button>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>Currently {svc.desired} desired, {svc.running} running.</div>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button className="btn btn-ghost" onClick={() => setScaleOpen(false)} style={{ flex: 1, justifyContent: "center" }}>Cancel</button>
            <button className="btn btn-primary" disabled={!!busy || desired === svc.desired} onClick={scale} style={{ flex: 1, justifyContent: "center" }}>
              {busy === "scale" ? <Spinner size={14} /> : <Icon.check />} Set to {desired}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}

export function Ecs({ refreshKey }: { refreshKey: number }) {
  const clusters = useAsync(() => api.ecsClusters(), [refreshKey]);
  const [active, setActive] = useState<string>("");

  // default to first cluster once loaded
  useEffect(() => {
    if (!active && clusters.data && clusters.data.length) setActive(clusters.data[0].name);
  }, [clusters.data, active]);

  const services = useAsync<EcsService[]>(() => (active ? api.ecsServices(active) : Promise.resolve([])), [active, refreshKey], 25);
  const [openSvc, setOpenSvc] = useState<EcsService | null>(null);

  const sorted = useMemo(() => {
    const order = { stopped: 0, degraded: 1, deploying: 2, healthy: 3 } as Record<string, number>;
    return [...(services.data ?? [])].sort((a, b) => (order[a.health] ?? 9) - (order[b.health] ?? 9) || a.name.localeCompare(b.name));
  }, [services.data]);

  if (clusters.initial) return <LoadingRows rows={4} />;
  if (clusters.error) return <Empty title="Couldn't list clusters" sub={clusters.error} icon={<Icon.alert w={26} />} />;
  if (!clusters.data?.length) return <Empty title="No ECS clusters" sub="Nothing to manage in this region/profile." icon={<Icon.ecs />} />;

  return (
    <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div className="seg">
          {clusters.data.map((c) => (
            <button key={c.name} className={active === c.name ? "on" : ""} onClick={() => setActive(c.name)}>
              {c.name.replace(/-cluster$/, "")}
              <span style={{ marginLeft: 7, opacity: 0.6, fontSize: 11 }}>{c.services_count}</span>
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {services.loading && <Spinner />}
      </div>

      {services.initial ? (
        <LoadingRows rows={3} />
      ) : sorted.length === 0 ? (
        <Empty title="No services" sub="This cluster has no active services." icon={<Icon.ecs />} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {sorted.map((s) => {
            const env = envOf(`${s.cluster} ${s.name}`);
            return (
              <div key={s.arn} className="glass-card tile" style={{ padding: "16px 17px" }} onClick={() => setOpenSvc(s)}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 660, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                  {env && <span className="chip" style={{ padding: "1px 8px", color: env.tone, borderColor: `${env.tone}44`, background: `${env.tone}14` }}>{env.label}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
                  <HealthBadge health={s.health} />
                  <span className="mono" style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    <span style={{ color: "var(--text)", fontWeight: 650 }}>{s.running}</span>/{s.desired}
                  </span>
                </div>
                <RatioBar running={s.running} desired={s.desired} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 11 }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.task_def}</span>
                  <Icon.chevron w={15} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {openSvc && <ServiceDrawer svc={openSvc} cluster={active} onClose={() => setOpenSvc(null)} onChanged={() => { services.reload(); clusters.reload(); }} />}
    </div>
  );
}
