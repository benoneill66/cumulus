import { useState } from "react";
import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import type { LambdaFn, InvokeResult, MetricPoint } from "../lib/types";
import { Empty, LoadingRows, Spinner, Sparkline, toast, CopyBtn } from "../components/ui";
import { Icon } from "../lib/icons";
import { runtimeLabel, ago, bytes, envOf } from "../lib/format";

function prettyJson(s: string): string {
  try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
}

function FnDrawer({ fn, onClose }: { fn: LambdaFn; onClose: () => void }) {
  const [payload, setPayload] = useState("{}");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<InvokeResult | null>(null);

  const invs = useAsync<MetricPoint[]>(() => api.metricSeries("AWS/Lambda", "Invocations", [["FunctionName", fn.name]], "Sum", 1440, 3600), [fn.name]);
  const errs = useAsync<MetricPoint[]>(() => api.metricSeries("AWS/Lambda", "Errors", [["FunctionName", fn.name]], "Sum", 1440, 3600), [fn.name]);

  const invTotal = (invs.data ?? []).reduce((a, p) => a + p.v, 0);
  const errTotal = (errs.data ?? []).reduce((a, p) => a + p.v, 0);

  async function invoke() {
    setBusy(true);
    setResult(null);
    try {
      const r = await api.lambdaInvoke(fn.name, payload);
      setResult(r);
      toast(r.ok ? "Invoked successfully" : `Function error: ${r.function_error}`, r.ok ? "ok" : "error");
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="drawer-scrim no-drag" onClick={onClose} />
      <div className="drawer no-drag">
        <div style={{ padding: "20px 22px 14px", borderBottom: "1px solid var(--hair-soft)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 720, letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis" }}>{fn.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{runtimeLabel(fn.runtime)} · {fn.memory} MB · {fn.timeout}s timeout</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 7 }}><Icon.close /></button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "16px 22px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* metrics 24h */}
          <div style={{ display: "flex", gap: 12 }}>
            <div className="glass-card" style={{ padding: "12px 13px", flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span className="label">Invocations 24h</span>
                <span className="mono" style={{ fontSize: 15, fontWeight: 680 }}>{invTotal.toFixed(0)}</span>
              </div>
              <Sparkline points={invs.data ?? []} color="var(--accent-3)" />
            </div>
            <div className="glass-card" style={{ padding: "12px 13px", flex: 1, borderColor: errTotal > 0 ? "rgba(255,93,122,0.3)" : undefined }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span className="label">Errors 24h</span>
                <span className="mono" style={{ fontSize: 15, fontWeight: 680, color: errTotal > 0 ? "var(--error)" : "var(--ok)" }}>{errTotal.toFixed(0)}</span>
              </div>
              <Sparkline points={errs.data ?? []} color={errTotal > 0 ? "var(--error)" : "var(--ok)"} />
            </div>
          </div>

          {/* meta */}
          <div className="glass-card" style={{ padding: "14px 16px" }}>
            <div className="meta-grid">
              <span className="k">Handler</span><span className="v mono" style={{ fontSize: 12 }}>{fn.handler || "—"}</span>
              <span className="k">Code size</span><span className="v">{bytes(fn.code_size)}</span>
              <span className="k">State</span><span className="v">{fn.state || "Active"}</span>
              <span className="k">Updated</span><span className="v">{ago(fn.last_modified)}</span>
            </div>
            {fn.description && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 12, lineHeight: 1.5 }}>{fn.description}</div>}
          </div>

          {/* invoke */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <span style={{ fontSize: 12.5, fontWeight: 680 }}>Test invoke</span>
              <span className="label">event payload (JSON)</span>
            </div>
            <textarea className="textarea" rows={5} value={payload} onChange={(e) => setPayload(e.target.value)} spellCheck={false} />
            <button className="btn btn-primary" disabled={busy} onClick={invoke} style={{ marginTop: 10, width: "100%", justifyContent: "center" }}>
              {busy ? <Spinner size={14} /> : <Icon.play />} {busy ? "Invoking…" : "Invoke"}
            </button>
          </div>

          {/* result */}
          {result && (
            <div className="glass-card rise" style={{ padding: "14px 16px", borderColor: result.ok ? "rgba(52,226,160,0.3)" : "rgba(255,93,122,0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span className={`dot ${result.ok ? "ok" : "error"}`} />
                <span style={{ fontSize: 13, fontWeight: 650 }}>{result.ok ? "Success" : result.function_error || "Failed"}</span>
                <span className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>· status {result.status_code}</span>
                <div style={{ flex: 1 }} />
                {result.payload && <CopyBtn text={result.payload} />}
              </div>
              {result.payload && (
                <>
                  <div className="label" style={{ marginBottom: 6 }}>Response</div>
                  <pre className="mono" style={{ margin: 0, fontSize: 11.5, background: "rgba(0,0,0,0.3)", padding: "10px 12px", borderRadius: 10, overflow: "auto", maxHeight: 220, lineHeight: 1.5 }}>{prettyJson(result.payload)}</pre>
                </>
              )}
              {result.log_tail && (
                <>
                  <div className="label" style={{ margin: "12px 0 6px" }}>Logs</div>
                  <pre className="mono" style={{ margin: 0, fontSize: 11, color: "var(--muted)", background: "rgba(0,0,0,0.3)", padding: "10px 12px", borderRadius: 10, overflow: "auto", maxHeight: 200, lineHeight: 1.5 }}>{result.log_tail}</pre>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function Lambda({ refreshKey }: { refreshKey: number }) {
  const fns = useAsync(() => api.lambdaFunctions(), [refreshKey]);
  const [open, setOpen] = useState<LambdaFn | null>(null);
  const [q, setQ] = useState("");

  if (fns.initial) return <LoadingRows rows={4} />;
  if (fns.error) return <Empty title="Couldn't list functions" sub={fns.error} icon={<Icon.alert w={26} />} />;
  if (!fns.data?.length) return <Empty title="No Lambda functions" sub="None in this region/profile." icon={<Icon.lambda />} />;

  const filtered = fns.data.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ position: "relative", maxWidth: 320 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", display: "flex" }}><Icon.search /></span>
        <input className="input" placeholder="Search functions…" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 36 }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
        {filtered.map((f) => {
          const env = envOf(f.name);
          return (
            <div key={f.name} className="glass-card tile" style={{ padding: "15px 17px" }} onClick={() => setOpen(f)}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 10 }}>
                <div className="tile-glyph" style={{ width: 36, height: 36, fontSize: 16, background: "linear-gradient(140deg, rgba(255,157,47,0.2), rgba(255,157,47,0.06))", border: "1px solid rgba(255,157,47,0.3)", color: "var(--accent)" }}>
                  <Icon.lambda />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{runtimeLabel(f.runtime)} · {f.memory} MB</div>
                </div>
                {env && <span className="chip" style={{ padding: "1px 8px", color: env.tone, borderColor: `${env.tone}44`, background: `${env.tone}14` }}>{env.label}</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5, color: "var(--muted)" }}>
                <span>Updated {ago(f.last_modified)}</span>
                <span className="mono">{bytes(f.code_size)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {open && <FnDrawer fn={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
