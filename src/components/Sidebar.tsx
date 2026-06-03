import { Icon } from "../lib/icons";
import { startWindowDrag } from "../lib/api";
import type { Identity } from "../lib/types";

export type ViewId = "overview" | "ecs" | "lambda" | "logs" | "alarms" | "storage" | "database" | "settings";

const NAV: { id: ViewId; label: string; icon: () => React.JSX.Element }[] = [
  { id: "overview", label: "Overview", icon: Icon.overview },
  { id: "ecs", label: "Services", icon: Icon.ecs },
  { id: "lambda", label: "Functions", icon: Icon.lambda },
  { id: "logs", label: "Logs", icon: Icon.logs },
  { id: "alarms", label: "Alarms", icon: Icon.alarms },
  { id: "storage", label: "Storage", icon: Icon.storage },
  { id: "database", label: "Database", icon: Icon.database },
];

export function Sidebar({
  view, setView, identity, alarmsFiring,
}: { view: ViewId; setView: (v: ViewId) => void; identity: Identity | null; alarmsFiring: number }) {
  const authed = identity?.ok ?? false;
  return (
    <aside onMouseDown={startWindowDrag} style={{ width: 234, flexShrink: 0, padding: "0 14px 14px", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* clear the traffic lights */}
      <div style={{ height: 52 }} />

      <div className="no-drag" style={{ display: "flex", alignItems: "center", gap: 11, padding: "4px 8px 18px" }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
          boxShadow: "0 6px 18px -6px rgba(255,140,47,0.9)",
          display: "grid", placeItems: "center", color: "#1a1205",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.5 19a4.5 4.5 0 1 0 0-9h-1.8A7 7 0 1 0 4 16.3" />
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 740, fontSize: 15, lineHeight: 1, letterSpacing: "-0.02em" }}>Cumulus</div>
          <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3, letterSpacing: "0.06em" }}>AWS CONTROL ROOM</div>
        </div>
      </div>

      <nav className="no-drag" style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {NAV.map((n) => (
          <div key={n.id} className={`nav-item ${view === n.id ? "active" : ""}`} onClick={() => setView(n.id)}>
            <n.icon />
            <span style={{ flex: 1 }}>{n.label}</span>
            {n.id === "alarms" && alarmsFiring > 0 && (
              <span className="chip" style={{ padding: "1px 7px", color: "var(--error)", borderColor: "transparent", background: "rgba(255,93,122,0.18)" }}>{alarmsFiring}</span>
            )}
          </div>
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      <div className="no-drag" style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div className={`nav-item ${view === "settings" ? "active" : ""}`} onClick={() => setView("settings")}>
          <Icon.settings />
          <span>Settings</span>
        </div>
      </div>

      {/* identity / auth footer */}
      <div className="no-drag glass-card" style={{ marginTop: 12, padding: "11px 12px", cursor: "default" }} onClick={() => setView("settings")}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span className={`dot ${authed ? "ok" : "error"}`} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {authed ? identity?.account : "Not signed in"}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {identity?.profile ?? "—"} · {identity?.region ?? "—"}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
