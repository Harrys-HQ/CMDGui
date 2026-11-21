use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

// Serialize read/modify/write operations so concurrent settings saves cannot lose keys.
static SETTINGS_LOCK: Mutex<()> = Mutex::new(());

pub(crate) fn get_settings_path() -> PathBuf {
    let app_dir = if cfg!(debug_assertions) {
        "CmdGUI-Dev"
    } else {
        "CmdGUI"
    };
    let base_dir = if let Ok(appdata) = std::env::var("APPDATA") {
        PathBuf::from(appdata).join(app_dir)
    } else if let Ok(home) = std::env::var("HOME") {
        PathBuf::from(home).join(".config").join(app_dir)
    } else {
        PathBuf::from(".")
    };
    base_dir.join("settings.json")
}

#[tauri::command]
pub async fn settings_get(key: Option<String>) -> Result<serde_json::Value, String> {
    tokio::task::spawn_blocking(move || {
        let _guard = SETTINGS_LOCK.lock().map_err(|e| e.to_string())?;
        let path = get_settings_path();
        if !path.exists() {
            // Return Null (not an empty object) so the frontend falls back to defaults
            return Ok(serde_json::Value::Null);
        }

        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
        let settings: serde_json::Value =
            serde_json::from_str(&content).unwrap_or(serde_json::Value::Null);

        if let Some(k) = key {
            // Return Null if key is missing — never return {} for missing keys
            Ok(settings.get(&k).cloned().unwrap_or(serde_json::Value::Null))
        } else {
            Ok(settings)
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn settings_get_many(
    keys: Vec<String>,
) -> Result<serde_json::Map<String, serde_json::Value>, String> {
    let mut settings = match settings_get(None).await? {
        serde_json::Value::Object(settings) => settings,
        _ => return Ok(serde_json::Map::new()),
    };
    Ok(keys
        .into_iter()
        .filter_map(|key| settings.remove(&key).map(|value| (key, value)))
        .collect())
}

#[tauri::command]
pub async fn settings_set(key: String, value: serde_json::Value) -> Result<(), String> {
    settings_set_many(serde_json::Map::from_iter([(key, value)])).await
}

fn merge_settings(
    path: &std::path::Path,
    changes: serde_json::Map<String, serde_json::Value>,
) -> Result<(), String> {
    if changes.is_empty() {
        return Ok(());
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut settings: serde_json::Map<String, serde_json::Value> = match fs::read_to_string(path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => serde_json::Map::new(),
        Err(error) => return Err(error.to_string()),
    };
    if changes
        .iter()
        .all(|(key, value)| settings.get(key) == Some(value))
    {
        return Ok(());
    }
    settings.extend(changes);
    let bytes = serde_json::to_vec_pretty(&settings).map_err(|e| e.to_string())?;
    let pending = path.with_extension("tmp");
    fs::write(&pending, bytes).map_err(|e| e.to_string())?;
    fs::rename(pending, path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn settings_set_many(
    changes: serde_json::Map<String, serde_json::Value>,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let _guard = SETTINGS_LOCK.lock().map_err(|e| e.to_string())?;
        merge_settings(&get_settings_path(), changes)
    })
    .await
    .map_err(|e| e.to_string())?
}
