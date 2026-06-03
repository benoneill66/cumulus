mod awscli;
mod commands;
mod models;

use commands::AppState;
use models::Settings;
use parking_lot::RwLock;
use tauri::Manager;

#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Persist settings under the OS app-data dir.
            let dir = app.path().app_data_dir().expect("app data dir");
            std::fs::create_dir_all(&dir).ok();
            let settings_path = dir.join("settings.json");
            let settings = std::fs::read_to_string(&settings_path)
                .ok()
                .and_then(|s| serde_json::from_str::<Settings>(&s).ok())
                .unwrap_or_default();
            app.manage(AppState {
                settings: RwLock::new(settings),
                settings_path,
            });

            // True native macOS glass: a thick NSVisualEffectView behind the
            // webview. HudWindow gives the heavier, more opaque frosted look
            // (vs. the thin Sidebar material) the user asked for.
            #[cfg(target_os = "macos")]
            if let Some(win) = app.get_webview_window("main") {
                let _ = apply_vibrancy(
                    &win,
                    NSVisualEffectMaterial::HudWindow,
                    Some(NSVisualEffectState::Active),
                    Some(18.0),
                );
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::save_settings,
            commands::list_profiles,
            commands::list_regions,
            commands::check_auth,
            commands::sso_login,
            commands::ecs_clusters,
            commands::ecs_services,
            commands::ecs_restart_service,
            commands::ecs_scale_service,
            commands::lambda_functions,
            commands::lambda_invoke,
            commands::alarms,
            commands::log_groups,
            commands::log_tail,
            commands::s3_buckets,
            commands::s3_list,
            commands::rds_instances,
            commands::metric_series,
            commands::overview,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Cumulus");
}
