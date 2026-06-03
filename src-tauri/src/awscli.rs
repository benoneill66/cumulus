//! Thin async wrapper around the system `aws` CLI.
//!
//! Cumulus deliberately shells out to the AWS CLI rather than embedding the AWS
//! Rust SDK: the CLI already owns the user's credential chain (static keys, env,
//! and crucially SSO token refresh), so auth "just works" and stays fresh without
//! us reimplementing the SSO device flow. Every call returns parsed JSON or a
//! human-readable error lifted from the CLI's stderr.

use anyhow::{anyhow, Result};
use serde_json::Value;
use tokio::process::Command;

/// Resolve the `aws` binary. Bundled `.app` processes inherit a minimal PATH that
/// usually omits Homebrew, so probe the common install locations before falling
/// back to a bare `aws` (which works when launched from a shell during `tauri dev`).
pub fn aws_bin() -> String {
    const CANDIDATES: [&str; 4] = [
        "/opt/homebrew/bin/aws",
        "/usr/local/bin/aws",
        "/usr/bin/aws",
        "/opt/local/bin/aws",
    ];
    for c in CANDIDATES {
        if std::path::Path::new(c).exists() {
            return c.to_string();
        }
    }
    "aws".to_string()
}

/// Run an `aws` subcommand and parse stdout as JSON.
///
/// `args` is the service/operation and its flags, e.g. `["ecs", "list-clusters"]`.
/// Region/profile/output flags are appended automatically. A non-zero exit is
/// surfaced as an error carrying the CLI's stderr so the UI can show, e.g.,
/// "The SSO session has expired" and prompt a re-login.
pub async fn run_json(region: &str, profile: &str, args: &[&str]) -> Result<Value> {
    let out = run_raw(region, profile, args).await?;
    if out.trim().is_empty() {
        return Ok(Value::Null);
    }
    serde_json::from_str(&out).map_err(|e| anyhow!("could not parse aws output: {e}"))
}

/// Run an `aws` subcommand, returning raw stdout (for non-JSON or when we want
/// the literal payload, e.g. a Lambda invoke response file).
pub async fn run_raw(region: &str, profile: &str, args: &[&str]) -> Result<String> {
    let bin = aws_bin();
    let mut cmd = Command::new(&bin);
    cmd.args(args)
        .arg("--region")
        .arg(region)
        .arg("--output")
        .arg("json")
        .arg("--no-cli-pager")
        .arg("--color")
        .arg("off");
    if !profile.is_empty() {
        cmd.arg("--profile").arg(profile);
    }
    // Ensure the CLI can find ~/.aws even under a bundled app's slim environment.
    if let Ok(home) = std::env::var("HOME") {
        cmd.env("HOME", home);
    }
    cmd.env("AWS_PAGER", "");

    let output = cmd
        .output()
        .await
        .map_err(|e| anyhow!("failed to launch aws CLI ({bin}): {e}"))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let msg = stderr.trim();
        let msg = if msg.is_empty() {
            format!("aws {} exited with {}", args.join(" "), output.status)
        } else {
            // Keep it to the last meaningful line — CLI errors are usually one line.
            msg.lines().last().unwrap_or(msg).to_string()
        };
        Err(anyhow!(msg))
    }
}
