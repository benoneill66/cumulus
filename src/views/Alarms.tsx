import { useState } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import { AlarmBadge, Empty, LoadingRows } from "../components/ui";
import { Icon } from "../lib/icons";
import { ago } from "../lib/format";

export function Alarms({ refreshKey }: { refreshKey: number }) {
  const alarms = useAsync(() => api.alarms(), [refreshKey], 30);
  const [show, setShow] = useState<"all" | "ALARM" | "OK" | "INSUFFICIENT_DATA">("all");

  if (alarms.initial) return <LoadingRows rows={5} />;
  if (alarms.error) return <Empty title="Couldn't list alarms" sub={alarms.error} icon={<Icon.alert w={26} />} />;
  if (!alarms.data?.length) return <Empty title="No alarms" sub="No CloudWatch alarms in this region/profile." icon={<Icon.alarms />} />;

  const counts = {
    ALARM: alarms.data.filter((a) => a.state === "ALARM").length,
    OK: alarms.data.filter((a) => a.state === "OK").length,
    INSUFFICIENT_DATA: alarms.data.filter((a) => a.state === "INSUFFICIENT_DATA").length,
  };
  const list = alarms.data.filter((a) => show === "all" || a.state === show);

  const Tab = ({ id, label }: { id: typeof show; label: string }) => (
    <button className={show === id ? "on" : ""} onClick={() => setShow(id)}>{label}</button>
  );

  return (
    <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="seg" style={{ alignSelf: "flex-start" }}>
        <Tab id="all" label={`All ${alarms.data.length}`} />
        <Tab id="ALARM" label={`In alarm ${counts.ALARM}`} />
        <Tab id="OK" label={`OK ${counts.OK}`} />
        <Tab id="INSUFFICIENT_DATA" label={`No data ${counts.INSUFFICIENT_DATA}`} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {list.map((a) => (
          <div key={a.name} className="glass-card" style={{ padding: "13px 16px", display: "flex", alignItems: "center", gap: 14, borderColor: a.state === "ALARM" ? "rgba(255,93,122,0.3)" : undefined }}>
            <AlarmBadge state={a.state} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 620, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {a.namespace && <span className="mono">{a.metric}</span>}{a.reason ? ` — ${a.reason}` : ""}
              </div>
            </div>
            {!a.actions_enabled && <span className="chip" style={{ fontSize: 10.5, color: "var(--muted)" }}>actions off</span>}
            <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>{ago(a.updated)}</span>
          </div>
        ))}
        {list.length === 0 && <Empty title="Nothing here" sub={`No alarms in "${show}".`} icon={<Icon.check w={24} />} />}
      </div>
    </div>
  );
}
