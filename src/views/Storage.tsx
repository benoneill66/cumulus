import { useState } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import type { Bucket } from "../lib/types";
import { Empty, LoadingRows, Spinner } from "../components/ui";
import { Icon } from "../lib/icons";
import { bytes, ago, envOf } from "../lib/format";

function Browser({ bucket, onBack }: { bucket: Bucket; onBack: () => void }) {
  const [prefix, setPrefix] = useState("");
  const listing = useAsync(() => api.s3List(bucket.name, prefix), [bucket.name, prefix]);

  const crumbs = prefix ? prefix.replace(/\/$/, "").split("/") : [];
  const goTo = (idx: number) => setPrefix(idx < 0 ? "" : crumbs.slice(0, idx + 1).join("/") + "/");

  return (
    <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button className="btn btn-sm btn-ghost" onClick={onBack}><Icon.back w={15} /> Buckets</button>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, flexWrap: "wrap", minWidth: 0 }}>
          <span className="mono" style={{ fontWeight: 650, cursor: "pointer", color: "var(--accent)" }} onClick={() => goTo(-1)}>{bucket.name}</span>
          {crumbs.map((c, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)" }}>
              <Icon.chevron w={13} />
              <span className="mono" style={{ cursor: "pointer", color: i === crumbs.length - 1 ? "var(--text)" : "var(--muted)" }} onClick={() => goTo(i)}>{c}</span>
            </span>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {listing.loading && <Spinner />}
      </div>

      {listing.initial ? (
        <LoadingRows rows={4} />
      ) : listing.error ? (
        <Empty title="Couldn't list objects" sub={listing.error} icon={<Icon.alert w={26} />} />
      ) : (
        <div className="glass-card" style={{ padding: 8 }}>
          {(listing.data?.folders.length ?? 0) === 0 && (listing.data?.objects.length ?? 0) === 0 ? (
            <div style={{ padding: 28, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Empty</div>
          ) : (
            <>
              {listing.data?.folders.map((f) => {
                const name = f.slice(prefix.length).replace(/\/$/, "");
                return (
                  <div key={f} className="nav-item" style={{ borderRadius: 10 }} onClick={() => setPrefix(f)}>
                    <span style={{ color: "var(--accent)", display: "flex" }}><Icon.folder /></span>
                    <span className="mono" style={{ flex: 1, fontSize: 12.5 }}>{name}/</span>
                    <Icon.chevron w={14} />
                  </div>
                );
              })}
              {listing.data?.objects.map((o) => {
                const name = o.key.slice(prefix.length);
                return (
                  <div key={o.key} className="nav-item" style={{ borderRadius: 10, cursor: "default" }}>
                    <span style={{ color: "var(--muted)", display: "flex" }}><Icon.file /></span>
                    <span className="mono" style={{ flex: 1, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                    <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>{ago(o.last_modified)}</span>
                    <span className="mono" style={{ fontSize: 11.5, color: "var(--muted)", width: 72, textAlign: "right" }}>{bytes(o.size)}</span>
                  </div>
                );
              })}
            </>
          )}
          {listing.data?.truncated && (
            <div style={{ padding: "10px 14px", fontSize: 11.5, color: "var(--alert)", textAlign: "center" }}>Showing first 500 — more objects not listed.</div>
          )}
        </div>
      )}
    </div>
  );
}

export function Storage({ refreshKey }: { refreshKey: number }) {
  const buckets = useAsync(() => api.s3Buckets(), [refreshKey]);
  const [open, setOpen] = useState<Bucket | null>(null);

  if (open) return <Browser bucket={open} onBack={() => setOpen(null)} />;

  if (buckets.initial) return <LoadingRows rows={4} />;
  if (buckets.error) return <Empty title="Couldn't list buckets" sub={buckets.error} icon={<Icon.alert w={26} />} />;
  if (!buckets.data?.length) return <Empty title="No S3 buckets" sub="None in this account." icon={<Icon.storage />} />;

  return (
    <div className="fade" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
      {buckets.data.map((b) => {
        const env = envOf(b.name);
        return (
          <div key={b.name} className="glass-card tile" style={{ padding: "16px 17px" }} onClick={() => setOpen(b)}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div className="tile-glyph" style={{ width: 38, height: 38, background: "linear-gradient(140deg, rgba(124,156,255,0.2), rgba(124,156,255,0.06))", border: "1px solid rgba(124,156,255,0.3)", color: "var(--accent-3)" }}>
                <Icon.storage />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="mono" style={{ fontSize: 13, fontWeight: 620, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>created {ago(b.created)}</div>
              </div>
              {env && <span className="chip" style={{ padding: "1px 8px", color: env.tone, borderColor: `${env.tone}44`, background: `${env.tone}14` }}>{env.label}</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5, color: "var(--muted)" }}>
              <span>Browse objects</span>
              <Icon.chevron w={15} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
