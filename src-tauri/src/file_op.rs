use std::fs;
use std::path::Path;
use std::process::Command;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub name: String,
    pub is_directory: bool,
    pub path: String,
}

#[tauri::command]
pub async fn file_create(file_path: String) -> Result<(), String> {
    fs::write(&file_path, "").map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn file_mkdir(dir_path: String) -> Result<(), String> {
    fs::create_dir_all(&dir_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn file_rename(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn file_delete(item_path: String) -> Result<(), String> {
    // Delete item. For simplicity and avoiding external trash dependency on MSVC,
    // we can delete directly or execute a powershell recycle command. Let's do standard removal.
    let path = Path::new(&item_path);
    if path.is_dir() {
        fs::remove_dir_all(path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub async fn file_show_in_folder(item_path: String) -> Result<(), String> {
    let path = Path::new(&item_path);
    if cfg!(target_os = "windows") {
        Command::new("explorer.exe")
            .arg(format!("/select,{}", path.display()))
            .spawn()
            .map_err(|e| e.to_string())?;
    } else if cfg!(target_os = "macos") {
        Command::new("open")
            .arg("-R")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    } else {
        // Linux fallback
        if let Some(parent) = path.parent() {
            Command::new("xdg-open")
                .arg(parent)
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn fs_list_directory(dir_path: String) -> Result<Vec<FileEntry>, String> {
    let path = Path::new(&dir_path);
    let read_dir = fs::read_dir(path).map_err(|e| e.to_string())?;
    let mut entries = Vec::new();

    for entry in read_dir {
        if let Ok(entry) = entry {
            let file_name = entry.file_name().to_string_lossy().to_string();
            let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
            let absolute_path = entry.path().to_string_lossy().to_string();
            
            entries.push(FileEntry {
                name: file_name,
                is_directory: is_dir,
                path: absolute_path,
            });
        }
    }

    Ok(entries)
}

#[tauri::command]
pub async fn shell_open_path(file_path: String) -> Result<bool, String> {
    if cfg!(target_os = "windows") {
        let path_str = file_path.trim().to_string();
        let lower_path = path_str.to_lowercase();
        if lower_path.starts_with("http://") || lower_path.starts_with("https://") || lower_path.starts_with("mailto:") {
            let escaped_url = path_str.replace("^", "^^").replace("&", "^&");
            Command::new("cmd.exe")
                .args(&["/c", "start", "", &escaped_url])
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            let formatted_path = path_str.replace("/", "\\");
            Command::new("cmd.exe")
                .args(&["/c", "start", "", &formatted_path])
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    } else if cfg!(target_os = "macos") {
        let path = Path::new(&file_path);
        Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    } else {
        let path = Path::new(&file_path);
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(true)
}

#[tauri::command]
pub async fn app_check_admin() -> bool {
    if cfg!(target_os = "windows") {
        #[cfg(target_os = "windows")]
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let mut cmd = Command::new("net");
        cmd.arg("session");
        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);
        cmd.output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    } else {
        // Unix root check
        let output = Command::new("id")
            .arg("-u")
            .output();
        if let Ok(out) = output {
            let uid = String::from_utf8_lossy(&out.stdout).trim().to_string();
            uid == "0"
        } else {
            false
        }
    }
}

#[tauri::command]
pub fn app_relaunch_admin(app_handle: tauri::AppHandle) {
    if cfg!(target_os = "windows") {
        if let Ok(current_exe) = std::env::current_exe() {
            #[cfg(target_os = "windows")]
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            let mut cmd = Command::new("powershell.exe");
            cmd.args(&[
                "Start-Process",
                &format!("\"{}\"", current_exe.display()),
                "-Verb",
                "RunAs",
            ]);
            #[cfg(target_os = "windows")]
            cmd.creation_flags(CREATE_NO_WINDOW);
            let _ = cmd.spawn();
            app_handle.exit(0);
        }
    }
}

#[tauri::command]
pub async fn dialog_select_folder() -> Result<Option<String>, String> {
    let folder = rfd::FileDialog::new()
        .set_title("Select Project Folder")
        .pick_folder();
    Ok(folder.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn open_in_vscode(path: String) -> Result<(), String> {
    if cfg!(target_os = "windows") {
        Command::new("cmd.exe")
            .args(&["/c", "code", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    } else {
        Command::new("code")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub struct StayAwakeState {
    pub tx: std::sync::Mutex<Option<std::sync::mpsc::Sender<()>>>,
}

impl Default for StayAwakeState {
    fn default() -> Self {
        Self {
            tx: std::sync::Mutex::new(None),
        }
    }
}

#[tauri::command]
pub async fn set_stay_awake(
    enabled: bool,
    state: tauri::State<'_, StayAwakeState>,
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::sync::mpsc::channel;
        use std::time::Duration;

        let mut tx_guard = state.tx.lock().map_err(|e| e.to_string())?;
        if enabled {
            if tx_guard.is_none() {
                let (tx, rx) = channel::<()>();
                *tx_guard = Some(tx);

                std::thread::spawn(move || {
                    extern "system" {
                        fn SetThreadExecutionState(esFlags: u32) -> u32;
                    }
                    const ES_CONTINUOUS: u32 = 0x80000000;
                    const ES_DISPLAY_REQUIRED: u32 = 0x00000002;
                    const ES_SYSTEM_REQUIRED: u32 = 0x00000001;

                    let flags = ES_CONTINUOUS | ES_DISPLAY_REQUIRED | ES_SYSTEM_REQUIRED;

                    loop {
                        unsafe {
                            SetThreadExecutionState(flags);
                        }
                        if rx.recv_timeout(Duration::from_secs(15)).is_ok() {
                            unsafe {
                                SetThreadExecutionState(ES_CONTINUOUS);
                            }
                            break;
                        }
                    }
                });
            }
        } else {
            if let Some(tx) = tx_guard.take() {
                let _ = tx.send(());
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn read_clipboard() -> Result<String, String> {
    let mut ctx = arboard::Clipboard::new().map_err(|e| e.to_string())?;
    ctx.get_text().map_err(|e| e.to_string())
}



