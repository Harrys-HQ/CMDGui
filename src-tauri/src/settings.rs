use std::fs;
use std::path::PathBuf;

fn get_settings_path() -> PathBuf {
    let base_dir = if let Ok(appdata) = std::env::var("APPDATA") {
        PathBuf::from(appdata).join("CmdGUI")
    } else if let Ok(home) = std::env::var("HOME") {
        PathBuf::from(home).join(".config").join("CmdGUI")
    } else {
        PathBuf::from(".")
    };
    base_dir.join("settings.json")
}

#[tauri::command]
pub async fn settings_get(key: Option<String>) -> Result<serde_json::Value, String> {
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
}

#[tauri::command]
pub async fn settings_set(key: String, value: serde_json::Value) -> Result<(), String> {
    let path = get_settings_path();

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let mut settings = if path.exists() {
        let content = fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str::<serde_json::Value>(&content)
            .unwrap_or(serde_json::Value::Object(serde_json::Map::new()))
    } else {
        serde_json::Value::Object(serde_json::Map::new())
    };

    if let Some(obj) = settings.as_object_mut() {
        obj.insert(key, value);
    }

    let new_content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(path, new_content).map_err(|e| e.to_string())?;
    Ok(())
}
