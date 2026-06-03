import { useCallback, useEffect, useState } from "react";
import { Sidebar, type ViewId } from "./components/Sidebar";
import { Overview } from "./views/Overview";
import { Ecs } from "./views/Ecs";
import { Lambda } from "./views/Lambda";
import { Logs } from "./views/Logs";
import { Alarms } from "./views/Alarms";
import { Storage } from "./views/Storage";
import { Database } from "./views/Database";
import { Settings } from "./views/Settings";
import { Toaster, Spinner } from "./components/ui";
import { api, IS_TAURI, startWindowDrag, toggleMaximize } from "./lib/api";
import type { Identity, Settings as SettingsT, Overview as OverviewData } from "./lib/types";
import { Icon } from "./lib/icons";

const TITLES: Record<ViewId, { title: string; sub: string }> = {
  overview: { title: "Overview", sub: "Your AWS estate at a glance" },
  ecs: { title: "Services", sub: "ECS clusters — restart, scale and inspect" },
  lambda: { title: "Functions", sub: "Lambda functions — invoke and watch" },
  logs: { title: "Logs", sub: "Tail CloudWatch logs across your services" },
  alarms: { title: "Alarms", sub: "CloudWatch alarm states" },
  storage: { title: "Storage", sub: "S3 buckets — browse objects" },
  database: { title: "Database", sub: "RDS instances and live metrics" },
  settings: { title: "Settings", sub: "Profile, region and connection" },
};

export default function App() {
  const [view, setView] = useState<ViewId>("overview");
  const [settings, setSettings] = useState<SettingsT | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [ovLoading, setOvLoading] = useState(true);
  const [ovError, setOvError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadSettings = useCallback(async () => {
    const s = await api.getSettings();
    setSettings(s);
    return s;
  }, []);

  const loadIdentity = useCallback(async () => {
    try { setIdentity(await api.checkAuth()); } catch { /* ignore */ }
  }, []);

  const loadOverview = useCallback(async () => {
    setOvLoading(true);
    try {
      const o = await api.overview();
      setOverview(o);
      setOvError(null);
    } catch (e) {
      setOvError(e instanceof Error ? e.message : String(e));
    } finally {
      setOvLoading(false);
    }
  }, []);

  // global refresh: bumps key (reloads active view) + reloads identity & overview
  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    await Promise.all([loadIdentity(), loadOverview()]);
    setRefreshing(false);
  }, [loadIdentity, loadOverview]);

  useEffect(() => {
    document.body.classList.toggle("no-native", !IS_TAURI);
    loadSettings();
    loadIdentity();
    loadOverview();
  }, [loadSettings, loadIdentity, loadOverview]);

  // poll the overview (and identity) on the configured cadence
  useEffect(() => {
    const secs = settings?.refresh_secs ?? 30;
    const id = window.setInterval(() => { loadOverview(); loadIdentity(); }, secs * 1000);
    return () => window.clearInterval(id);
  }, [settings?.refresh_secs, loadOverview, loadIdentity]);

  // when settings change (region/profile), reload everything
  const onSettingsChanged = useCallback(async () => {
    await loadSettings();
    refreshAll();
  }, [loadSettings, refreshAll]);

  const t = TITLES[view];

  return (
    <div style={{ display: "flex", height: "100vh", position: "relative" }}>
      <div className="aurora" />
      <Toaster />

      <div style={{ position: "relative", zIndex: 1, display: "flex", width: "100%" }}>
        <Sidebar view={view} setView={setView} identity={identity} alarmsFiring={overview?.alarms_firing.length ?? 0} />

        <div style={{ width: 1, background: "var(--hair-soft)" }} />

        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100%" }}>
          <header onMouseDown={startWindowDrag} onDoubleClick={toggleMaximize}
            style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "14px 26px", minHeight: 64 }}>
            <div>
              <div style={{ fontSize: 19, fontWeight: 720, letterSpacing: "-0.02em" }}>{t.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{t.sub}</div>
            </div>
            <div className="no-drag" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {settings && (
                <span className="chip" onClick={() => setView("settings")} style={{ cursor: "default" }}>
                  <span className="mono" style={{ color: "var(--text)" }}>{settings.profile}</span>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span className="mono">{settings.region}</span>
                </span>
              )}
              <button className="btn btn-sm" onClick={refreshAll} disabled={refreshing}>
                {refreshing ? <Spinner size={14} /> : <Icon.refresh w={14} />} Refresh
              </button>
            </div>
          </header>

          <div style={{ flex: 1, overflow: view === "logs" ? "hidden" : "auto", padding: view === "logs" ? "6px 26px 26px" : "6px 26px 28px", minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div key={view} className="fade" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              {view === "overview" && <Overview data={overview} loading={ovLoading} error={ovError} setView={setView} />}
              {view === "ecs" && <Ecs refreshKey={refreshKey} />}
              {view === "lambda" && <Lambda refreshKey={refreshKey} />}
              {view === "logs" && <Logs refreshKey={refreshKey} />}
              {view === "alarms" && <Alarms refreshKey={refreshKey} />}
              {view === "storage" && <Storage refreshKey={refreshKey} />}
              {view === "database" && <Database refreshKey={refreshKey} />}
              {view === "settings" && <Settings settings={settings} identity={identity} onChanged={onSettingsChanged} />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
