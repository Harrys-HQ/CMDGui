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

#[cfg(target_os = "windows")]
fn to_wide_null(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

#[cfg(target_os = "windows")]
unsafe fn win_shell_execute(target: &str) -> isize {
    extern "system" {
        fn ShellExecuteW(
            hwnd: isize,
            operation: *const u16,
            file: *const u16,
            parameters: *const u16,
            directory: *const u16,
            show_cmd: i32,
        ) -> isize;
    }
    const SW_SHOWNORMAL: i32 = 1;
    let op = to_wide_null("open");
    let target_wide = to_wide_null(target);
    ShellExecuteW(
        0,
        op.as_ptr(),
        target_wide.as_ptr(),
        std::ptr::null(),
        std::ptr::null(),
        SW_SHOWNORMAL,
    )
}

#[tauri::command]
pub async fn file_show_in_folder(item_path: String) -> Result<(), String> {
    let mut clean_path = item_path.trim().to_string();
    if clean_path.starts_with("~/") || clean_path.starts_with("~\\") {
        if let Some(home) = std::env::var_os("USERPROFILE").or_else(|| std::env::var_os("HOME")) {
            let home_str = home.to_string_lossy();
            clean_path = format!("{}{}", home_str.trim_end_matches(['/', '\\']), &clean_path[1..]);
        }
    }
    if clean_path.starts_with('/') && clean_path.len() > 2 && clean_path.chars().nth(2) == Some(':') {
        clean_path = clean_path[1..].to_string();
    }
    let formatted = clean_path.replace("/", "\\");
    let p = Path::new(&formatted);
    if cfg!(target_os = "windows") {
        if p.is_dir() {
            Command::new("explorer.exe")
                .arg(&formatted)
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            Command::new("explorer.exe")
                .arg(format!("/select,{}", formatted))
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    } else if cfg!(target_os = "macos") {
        Command::new("open")
            .arg("-R")
            .arg(p)
            .spawn()
            .map_err(|e| e.to_string())?;
    } else {
        // Linux fallback
        if let Some(parent) = p.parent() {
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
    let mut clean_path = dir_path.trim().to_string();
    if clean_path.starts_with("~/") || clean_path.starts_with("~\\") {
        if let Some(home) = std::env::var_os("USERPROFILE").or_else(|| std::env::var_os("HOME")) {
            let home_str = home.to_string_lossy();
            clean_path = format!("{}{}", home_str.trim_end_matches(['/', '\\']), &clean_path[1..]);
        }
    }
    if clean_path.starts_with('/') && clean_path.len() > 2 && clean_path.chars().nth(2) == Some(':') {
        clean_path = clean_path[1..].to_string();
    }
    let path = Path::new(&clean_path);
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
    let mut path_str = file_path.trim().to_string();

    // Expand leading tilde `~/` or `~\` to user home directory
    if path_str.starts_with("~/") || path_str.starts_with("~\\") {
        if let Some(home) = std::env::var_os("USERPROFILE").or_else(|| std::env::var_os("HOME")) {
            let home_str = home.to_string_lossy();
            path_str = format!("{}{}", home_str.trim_end_matches(['/', '\\']), &path_str[1..]);
        }
    }

    // Strip leading `/` before Windows drive letter: e.g. `/C:/path` -> `C:/path`
    if path_str.starts_with('/') && path_str.len() > 2 && path_str.chars().nth(2) == Some(':') {
        path_str = path_str[1..].to_string();
    }

    let lower_path = path_str.to_lowercase();

    if cfg!(target_os = "windows") {
        // 1. Web & email URLs: open with user's default browser via ShellExecuteW
        if lower_path.starts_with("http://") || lower_path.starts_with("https://") || lower_path.starts_with("mailto:") {
            unsafe {
                let res = win_shell_execute(&path_str);
                if res <= 32 {
                    // Fallback to start if ShellExecuteW had an issue
                    let escaped_url = path_str.replace("^", "^^").replace("&", "^&");
                    let _ = Command::new("cmd.exe")
                        .args(&["/c", "start", "", &escaped_url])
                        .spawn();
                }
            }
            return Ok(true);
        }

        // 2. Local files and directories
        let formatted_path = path_str.replace("/", "\\");
        let p = Path::new(&formatted_path);

        if p.is_dir() {
            unsafe {
                let res = win_shell_execute(&formatted_path);
                if res <= 32 {
                    let _ = Command::new("explorer.exe").arg(&formatted_path).spawn();
                }
            }
            return Ok(true);
        }

        // File path handling
        unsafe {
            let res = win_shell_execute(&formatted_path);
            // res <= 32 indicates an error, notably SE_ERR_NOASSOC = 31 (no file association in Registry, e.g. for .md/.log files)
            if res <= 32 {
                let ext = p.extension().and_then(|s| s.to_str()).unwrap_or("").to_lowercase();
                if ["md", "txt", "log", "json", "yaml", "yml", "toml", "rs", "ts", "tsx", "js", "jsx", "html", "css", "py", "sh", "bat", "ps1"].contains(&ext.as_str()) {
                    let _ = Command::new("notepad.exe").arg(&formatted_path).spawn();
                } else {
                    let _ = Command::new("explorer.exe").arg(format!("/select,{}", formatted_path)).spawn();
                }
            }
        }
    } else if cfg!(target_os = "macos") {
        let path = Path::new(&path_str);
        Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    } else {
        let path = Path::new(&path_str);
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
    let mut target_path = path.trim().to_string();
    if target_path.starts_with("~/") || target_path.starts_with("~\\") {
        if let Some(home) = std::env::var_os("USERPROFILE").or_else(|| std::env::var_os("HOME")) {
            let home_str = home.to_string_lossy();
            target_path = format!("{}{}", home_str.trim_end_matches(['/', '\\']), &target_path[1..]);
        }
    }
    if cfg!(target_os = "windows") {
        let spawn_res = Command::new("cmd.exe")
            .args(&["/c", "code", &target_path])
            .spawn();
        if spawn_res.is_err() {
            let _ = shell_open_path(target_path).await;
        }
    } else {
        let spawn_res = Command::new("code")
            .arg(&target_path)
            .spawn();
        if spawn_res.is_err() {
            let _ = shell_open_path(target_path).await;
        }
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



