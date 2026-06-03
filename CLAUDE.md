# Cumulus — agent guidance

Cumulus is a Tauri 2 + React (Vite) desktop app: a native "AWS control room"
for monitoring and managing the Edge AWS estate without the web console.
Frontend lives in `src/`, the Rust backend in `src-tauri/`. The built app
installs to `/Applications/Cumulus.app`.

## How it talks to AWS

The Rust backend **shells out to the system `aws` CLI** (see
`src-tauri/src/awscli.rs`) rather than embedding the AWS SDK. The CLI owns the
credential chain — including SSO token refresh — so auth "just works". Every
Tauri command in `src-tauri/src/commands.rs` runs an `aws … --output json`
invocation and shapes the result into the structs in `models.rs`, which mirror
the TypeScript types in `src/lib/types.ts` (snake_case on both sides).

Region + profile come from settings (`get_settings`/`save_settings`, persisted
to the app-data dir). Default: `eu-west-1` / `default`.

## Toolchain — use Bun

- `bun install` — deps.
- `bun run app` — run in dev (hot reload, opens the window).
- `bun run build` — type-check + build the frontend only.
- `bun run install-app` — release build + reinstall to `/Applications`.

`beforeDevCommand`/`beforeBuildCommand` in `tauri.conf.json` call `bun run …`.

## ALWAYS reinstall when committing to `main`

Whenever you commit to `main`, rebuild and reinstall so the installed
`/Applications/Cumulus.app` reflects committed code:

```sh
bun run install-app
```

The release build is slow (several minutes) — let it finish.

## Aesthetic

Native macOS "thick glass": an `NSVisualEffectMaterial::HudWindow` vibrancy view
sits behind a transparent webview (set in `lib.rs`), with layered glass cards, a
warm AWS-amber accent, an animated aurora wash, and `.no-native` fallbacks for
browser dev. Keep new UI consistent with `src/styles.css` primitives
(`.glass-card`, `.btn`, `.chip`, `.nav-item`, `.seg`, `.drawer`).

## Views

Overview · Services (ECS) · Functions (Lambda) · Logs · Alarms · Storage (S3) ·
Database (RDS) · Settings. Each view in `src/views/` loads its own data via
`useAsync` (`src/lib/hooks.ts`); the Overview is aggregated server-side by the
`overview` command and owned by `App.tsx` (also drives the sidebar alarm badge).
