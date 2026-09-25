#[cfg(target_os = "macos")]
use std::ffi::{CStr, c_char};

#[cfg(target_os = "macos")]
unsafe extern "C" {
    fn krmf_widget_snapshot_path() -> *const c_char;
    fn krmf_reload_widgets();
}

#[tauri::command]
pub async fn publish_widgets(payload: String) -> Result<(), String> {
    if payload.len() > 16 * 1024 * 1024 {
        return Err("Widget snapshot is too large".into());
    }

    let _: serde_json::Value =
        serde_json::from_str(&payload).map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    {
        let path = unsafe {
            let ptr = krmf_widget_snapshot_path();

            if ptr.is_null() {
                return Err("Widget shared container is unavailable".into());
            }

            CStr::from_ptr(ptr)
                .to_string_lossy()
                .into_owned()
        };

        tokio_write_snapshot(path, payload).await?;
    }

    Ok(())
}

#[cfg(target_os = "macos")]
async fn tokio_write_snapshot(path: String, payload: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        use std::fs;

        let path = std::path::PathBuf::from(path);

        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let should_write = match fs::read(&path) {
            Ok(existing) => existing != payload.as_bytes(),
            Err(_) => true,
        };

        if should_write {
            fs::write(&path, payload.as_bytes()).map_err(|e| e.to_string())?;
            eprintln!("KRMF_WIDGET: wrote snapshot to {}", path.display());

            unsafe {
                 krmf_reload_widgets();
            }

            eprintln!("KRMF_WIDGET: requested WidgetKit reload");
        } else {
              eprintln!("KRMF_WIDGET: snapshot unchanged");
        }

        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn report_widget_sync_error(message: String) {
    eprintln!("KRMF_WIDGET: sync failed: {}", message.chars().take(1000).collect::<String>());
}
