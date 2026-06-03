import { useEffect, useState } from "react";
import { Icon } from "../lib/icons";
import type { MetricPoint } from "../lib/types";

// ---------- toast pub/sub (no context plumbing) ----------
type Toast = { id: number; msg: string; tone: "ok" | "error" | "info" };
const listeners = new Set<(t: Toast) => void>();
let seq = 1;
export function toast(msg: string, tone: Toast["tone"] = "info") {
  const t = { id: seq++, msg, tone };
  listeners.forEach((l) => l(t));
}
export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const on = (t: Toast) => {
      setItems((s) => [...s, t]);
      window.setTimeout(() => setItems((s) => s.filter((x) => x.id !== t.id)), 5200);
    };
    listeners.add(on);
    return () => { listeners.delete(on); };
  }, []);
  if (!items.length) return null;
  const color = (tone: Toast["tone"]) => (tone === "ok" ? "var(--ok)" : tone === "error" ? "var(--error)" : "var(--accent)");
  return (
    <div style={{ position: "fixed", bottom: 22, right: 22, zIndex: 2000, display: "flex", flexDirection: "column", gap: 10, width: 340, maxWidth: "calc(100vw - 44px)" }}>
      {items.map((t) => (
        <div key={t.id} className="glass-card rise no-drag" onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))}
          style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", boxShadow: "0 14px 44px rgba(0,0,0,0.5)" }}>
          <span style={{ color: color(t.tone), display: "flex" }}>
            {t.tone === "error" ? <Icon.alert w={16} /> : t.tone === "ok" ? <Icon.check w={16} /> : <Icon.cloud />}
          </span>
          <span style={{ fontSize: 12.8, fontWeight: 550, flex: 1, lineHeight: 1.4 }}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- spinner ----------
export function Spinner({ size = 15 }: { size?: number }) {
  return <span className="spin" style={{ display: "inline-flex" }}><Icon.refresh w={size} /></span>;
}

// ---------- status / health ----------
export function StatusDot({ status }: { status: string }) {
  return <span className={`dot ${status.toLowerCase()}`} />;
}

export function HealthBadge({ health }: { health: string }) {
  const map: Record<string, { c: string; t: string }> = {
    healthy: { c: "var(--ok)", t: "Healthy" },
    deploying: { c: "var(--running)", t: "Deploying" },
    degraded: { c: "var(--alert)", t: "Degraded" },
    stopped: { c: "var(--error)", t: "Stopped" },
  };
  const s = map[health] ?? { c: "var(--muted)", t: health };
  return (
    <span className="chip" style={{ color: s.c, borderColor: `${s.c}44`, background: `${s.c}14` }}>
      <span className={`dot ${health}`} /> {s.t}
    </span>
  );
}

export function AlarmBadge({ state }: { state: string }) {
  const map: Record<string, { c: string; t: string }> = {
    ALARM: { c: "var(--error)", t: "In alarm" },
    OK: { c: "var(--ok)", t: "OK" },
    INSUFFICIENT_DATA: { c: "var(--muted)", t: "No data" },
  };
  const s = map[state] ?? { c: "var(--muted)", t: state };
  return (
    <span className="chip" style={{ color: s.c, borderColor: `${s.c}44`, background: `${s.c}14` }}>
      <span className={`dot ${state.toLowerCase()}`} /> {s.t}
    </span>
  );
}

// ---------- sparkline ----------
export function Sparkline({ points, color = "var(--accent)", height = 38, max }: { points: MetricPoint[]; color?: string; height?: number; max?: number }) {
  if (!points.length) return <div style={{ height, display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 11 }}>no data</div>;
  const vals = points.map((p) => p.v);
  const lo = Math.min(...vals, 0);
  const hi = max ?? Math.max(...vals, 1);
  const span = hi - lo || 1;
  const w = 120;
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const y = (v: number) => height - 4 - ((v - lo) / span) * (height - 8);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const area = `${d} L ${w} ${height} L 0 ${height} Z`;
  const gid = `g${color.replace(/[^a-z0-9]/gi, "")}-${Math.round(lo * 100)}-${points.length}`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ---------- ratio bar (running / desired) ----------
export function RatioBar({ running, desired }: { running: number; desired: number }) {
  const pct = desired > 0 ? Math.min(100, (running / desired) * 100) : 0;
  const tone = running >= desired && desired > 0 ? "var(--ok)" : running === 0 ? "var(--error)" : "var(--alert)";
  return (
    <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden", width: "100%" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: tone, borderRadius: 999, transition: "width .4s ease" }} />
    </div>
  );
}

// ---------- empty ----------
export function Empty({ title, sub, icon }: { title: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="glass-card rise" style={{ padding: "44px 24px", textAlign: "center" }}>
      <div style={{ opacity: 0.45, display: "flex", justifyContent: "center", marginBottom: 12 }}>{icon ?? <Icon.cloud />}</div>
      <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
      {sub && <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4, maxWidth: 420, marginInline: "auto", lineHeight: 1.5 }}>{sub}</div>}
    </div>
  );
}

// ---------- loading rows ----------
export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="glass-card" style={{ height: 64, opacity: 0.5 - i * 0.07 }} />
      ))}
    </div>
  );
}

// ---------- dialog ----------
export function Dialog({ title, children, onClose, width = 440 }: { title: string; children: React.ReactNode; onClose: () => void; width?: number }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="drawer-scrim no-drag" style={{ display: "grid", placeItems: "center" }} onClick={onClose}>
      <div className="glass-card rise" style={{ width, maxWidth: "92vw", padding: 0, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 12px" }}>
          <div style={{ fontSize: 15, fontWeight: 680 }}>{title}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 6 }}><Icon.close w={15} /></button>
        </div>
        <div style={{ padding: "0 18px 18px" }}>{children}</div>
      </div>
    </div>
  );
}

// ---------- copy button ----------
export function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1200); }}>
      {done ? <Icon.check w={13} /> : <Icon.copy />} {label ?? (done ? "Copied" : "Copy")}
    </button>
  );
}
