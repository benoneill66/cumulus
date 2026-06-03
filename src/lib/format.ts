export function bytes(n: number): string {
  if (!n || n < 0) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB", "PB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${u[i]}`;
}

export function num(n: number): string {
  return n.toLocaleString("en-GB");
}

/** Relative "2m ago" / "3h ago" from an ISO string or epoch ms. */
export function ago(input: string | number): string {
  if (!input) return "—";
  const t = typeof input === "number" ? input : Date.parse(input);
  if (Number.isNaN(t)) return "—";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 45) return "just now";
  if (s < 90) return "1m ago";
  const m = s / 60;
  if (m < 60) return `${Math.round(m)}m ago`;
  const h = m / 60;
  if (h < 24) return `${Math.round(h)}h ago`;
  const d = h / 24;
  if (d < 30) return `${Math.round(d)}d ago`;
  return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function clock(epochMs: number): string {
  const d = new Date(epochMs);
  return d.toLocaleTimeString("en-GB", { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0");
}

/** Friendly Lambda runtime label, e.g. "nodejs20.x" -> "Node 20". */
export function runtimeLabel(rt: string): string {
  if (!rt) return "—";
  const m = rt.match(/^([a-z]+)([\d.]+)?/);
  if (!m) return rt;
  const map: Record<string, string> = { nodejs: "Node", python: "Python", java: "Java", go: "Go", ruby: "Ruby", dotnet: "​.NET" };
  const base = map[m[1]] ?? m[1];
  const ver = (m[2] ?? "").replace(/\.x$/, "");
  return ver ? `${base} ${ver}` : base;
}

/** Environment tag inferred from a resource name (prod / stage / dev). */
export function envOf(name: string): { label: string; tone: string } | null {
  const n = name.toLowerCase();
  if (n.includes("prod")) return { label: "prod", tone: "var(--error)" };
  if (n.includes("stage") || n.includes("staging")) return { label: "stage", tone: "var(--accent-3)" };
  if (n.includes("dev")) return { label: "dev", tone: "var(--muted)" };
  return null;
}
