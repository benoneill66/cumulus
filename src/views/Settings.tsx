import { useState } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import type { Settings as SettingsT, Identity } from "../lib/types";
import { Spinner, toast, CopyBtn } from "../components/ui";
import { Icon } from "../lib/icons";

export function Settings({ settings, identity, onChanged }: { settings: SettingsT | null; identity: Identity | null; onChanged: () => void }) {
  const profiles = useAsync(() => api.listProfiles(), []);
  const regions = useAsync(() => api.listRegions(), []);
  const [saving, setSaving] = useState(false);
  const [ssoBusy, setSsoBusy] = useState(false);

  if (!settings) return <Spinner />;

  async function update(patch: Partial<SettingsT>) {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSaving(true);
    try {
      await api.saveSettings(next);
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setSaving(false);
    }
  }

  async function ssoLogin() {
    setSsoBusy(true);
    toast("Opening browser for SSO login…", "info");
    try {
      await api.ssoLogin();
      toast("Signed in", "ok");
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setSsoBusy(false);
    }
  }

  const authed = identity?.ok ?? false;

  return (
    <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 640 }}>
      {/* connection */}
      <div className="glass-card" style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span className={`dot ${authed ? "ok" : "error"}`} />
          <span style={{ fontSize: 14, fontWeight: 680 }}>{authed ? "Connected to AWS" : "Not connected"}</span>
          {saving && <Spinner size={13} />}
        </div>

        {authed ? (
          <div className="meta-grid" style={{ marginBottom: 4 }}>
            <span className="k">Account</span>
            <span className="v mono" style={{ display: "flex", alignItems: "center", gap: 8 }}>{identity?.account} <CopyBtn text={identity?.account ?? ""} /></span>
            <span className="k">Identity</span><span className="v mono" style={{ fontSize: 11.5, wordBreak: "break-all" }}>{identity?.arn}</span>
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55, marginBottom: 14 }}>
            {identity?.error || "Cumulus uses your AWS CLI credentials."} If this is an SSO profile, sign in below.
          </div>
        )}

        <button className="btn" disabled={ssoBusy} onClick={ssoLogin} style={{ marginTop: 14 }}>
          {ssoBusy ? <Spinner size={14} /> : <Icon.external w={14} />} {authed ? "Re-authenticate (SSO)" : "Sign in with SSO"}
        </button>
      </div>

      {/* profile + region */}
      <div className="glass-card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div className="label" style={{ marginBottom: 8 }}>Profile</div>
          <select className="input" value={settings.profile} onChange={(e) => update({ profile: e.target.value })}>
            {(profiles.data ?? [settings.profile]).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>From <span className="mono">~/.aws/config</span>. Switching reloads everything.</div>
        </div>

        <div>
          <div className="label" style={{ marginBottom: 8 }}>Region</div>
          <select className="input" value={settings.region} onChange={(e) => update({ region: e.target.value })}>
            {(regions.data ?? [settings.region]).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div>
          <div className="label" style={{ marginBottom: 8 }}>Auto-refresh — Overview</div>
          <div className="seg" style={{ alignSelf: "flex-start" }}>
            {[15, 30, 60, 120].map((s) => (
              <button key={s} className={settings.refresh_secs === s ? "on" : ""} onClick={() => update({ refresh_secs: s })}>{s < 60 ? `${s}s` : `${s / 60}m`}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 11.5, color: "var(--muted)", textAlign: "center", lineHeight: 1.6 }}>
        Cumulus · AWS control room<br />
        Talks to AWS through your local <span className="mono">aws</span> CLI — nothing is sent anywhere else.
      </div>
    </div>
  );
}
