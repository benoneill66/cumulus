import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import type { LogEvent } from "../lib/types";
import { Empty, LoadingRows, Spinner } from "../components/ui";
import { Icon } from "../lib/icons";
import { clock, bytes, envOf } from "../lib/format";

const RANGES = [
  { label: "15m", mins: 15 },
  { label: "1h", mins: 60 },
  { label: "3h", mins: 180 },
  { label: "12h", mins: 720 },
];

// Tint a log line by severity keywords.
function lineColor(msg: string): string {
  const m = msg.toLowerCase();
  if (/\b(error|exception|fatal|fail(ed|ure)?|panic)\b/.test(m)) return "var(--error)";
  if (/\b(warn|warning|deprecat)\b/.test(m)) return "var(--alert)";
  return "var(--text)";
}

export function Logs({ refreshKey }: { refreshKey: number }) {
  const groups = useAsync(() => api.logGroups(), [refreshKey]);
  const [active, setActive] = useState<string>("");
  const [q, setQ] = useState("");
  const [mins, setMins] = useState(60);
  const [filter, setFilter] = useState("");
  const [live, setLive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const events = useAsync<LogEvent[]>(
    () => (active ? api.logTail(active, mins, filter) : Promise.resolve([])),
    [active, mins, filter, refreshKey],
    live ? 8 : 0,
  );

  // auto-scroll to the newest line on update when live
  useEffect(() => {
    if (live && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [events.data, live]);

  const filteredGroups = useMemo(
    () => (groups.data ?? []).filter((g) => g.name.toLowerCase().includes(q.toLowerCase())),
    [groups.data, q],
  );

  if (groups.initial) return <LoadingRows rows={5} />;
  if (groups.error) return <Empty title="Couldn't list log groups" sub={groups.error} icon={<Icon.alert w={26} />} />;
  if (!groups.data?.length) return <Empty title="No log groups" sub="None in this region/profile." icon={<Icon.logs />} />;

  return (
    <div className="fade" style={{ display: "flex", gap: 14, height: "100%", minHeight: 0 }}>
      {/* group list */}
      <div className="glass-card" style={{ width: 270, flexShrink: 0, display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 12px 10px", borderBottom: "1px solid var(--hair-soft)", position: "relative" }}>
          <span style={{ position: "absolute", left: 22, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", display: "flex" }}><Icon.search w={14} /></span>
          <input className="input" placeholder="Filter groups…" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 34, fontSize: 12.5, padding: "8px 10px 8px 34px" }} />
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
          {filteredGroups.map((g) => {
            const short = g.name.replace(/^\/aws\/lambda\//, "λ ").replace(/^\/ecs\//, "ecs ").replace(/^\/aws\/ecs\/containerinsights\//, "ci ");
            const env = envOf(g.name);
            return (
              <div key={g.name} className={`nav-item ${active === g.name ? "active" : ""}`} onClick={() => setActive(g.name)} style={{ padding: "8px 10px", borderRadius: 9 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{short}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>{bytes(g.stored_bytes)}{g.retention_days > 0 ? ` · ${g.retention_days}d` : ""}</div>
                </div>
                {env && <span className="dot" style={{ background: env.tone, boxShadow: `0 0 8px ${env.tone}` }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* log pane */}
      <div className="glass-card" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
        {!active ? (
          <div style={{ flex: 1, display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 13 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ opacity: 0.4, display: "flex", justifyContent: "center", marginBottom: 10 }}><Icon.logs /></div>
              Pick a log group to tail
            </div>
          </div>
        ) : (
          <>
            {/* toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderBottom: "1px solid var(--hair-soft)", flexWrap: "wrap" }}>
              <div style={{ fontSize: 12.5, fontWeight: 650, fontFamily: "var(--mono)" }} className="mono">{active}</div>
              <div style={{ flex: 1 }} />
              <div className="seg">
                {RANGES.map((r) => (
                  <button key={r.mins} className={mins === r.mins ? "on" : ""} onClick={() => setMins(r.mins)}>{r.label}</button>
                ))}
              </div>
              <button className={`btn btn-sm ${live ? "btn-primary" : ""}`} onClick={() => setLive((v) => !v)}>
                <span className={`dot ${live ? "running" : "idle"}`} /> {live ? "Live" : "Paused"}
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => events.reload()} disabled={events.loading} style={{ padding: 7 }}>
                {events.loading ? <Spinner size={14} /> : <Icon.refresh w={14} />}
              </button>
            </div>
            {/* filter */}
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--hair-soft)" }}>
              <input className="input mono" placeholder='Filter pattern — e.g.  ERROR   or   "user 123"   (CloudWatch syntax)' value={filter}
                onChange={(e) => setFilter(e.target.value)} style={{ fontSize: 12, padding: "7px 11px" }} />
            </div>
            {/* lines */}
            <div ref={scrollRef} style={{ flex: 1, overflow: "auto", padding: "8px 14px" }}>
              {events.initial ? (
                <div style={{ padding: 20 }}><Spinner /></div>
              ) : events.error ? (
                <div style={{ color: "var(--error)", fontSize: 12.5, padding: 16 }}>{events.error}</div>
              ) : !events.data?.length ? (
                <div style={{ color: "var(--muted)", fontSize: 12.5, padding: 16, textAlign: "center" }}>No events in the last {mins >= 60 ? `${mins / 60}h` : `${mins}m`}{filter ? " matching filter" : ""}.</div>
              ) : (
                events.data.map((ev, i) => (
                  <div key={i} className="logline">
                    <span className="logts">{clock(ev.timestamp)}</span>{"  "}
                    <span style={{ color: lineColor(ev.message) }}>{ev.message.trimEnd()}</span>
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: "7px 14px", borderTop: "1px solid var(--hair-soft)", fontSize: 11, color: "var(--muted)", display: "flex", justifyContent: "space-between" }}>
              <span>{events.data?.length ?? 0} events</span>
              <span>{live ? "auto-refreshing every 8s" : "paused"}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
