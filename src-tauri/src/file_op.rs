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
    let path = Path::new(&file_path);
    if cfg!(target_os = "windows") {
        Command::new("cmd.exe")
            .args(&["/c", "start", "", &path.to_string_lossy()])
            .spawn()
            .map_err(|e| e.to_string())?;
    } else if cfg!(target_os = "macos") {
        Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    } else {
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
    if cfg!(target_os = "windows") {
        #[cfg(target_os = "windows")]
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let mut cmd = Command::new("powershell.exe");
        cmd.args(&[
            "-NoProfile",
            "-Command",
            "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; if ($f.ShowDialog() -eq 'OK') { $f.SelectedPath }",
        ]);
        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);
        let output = cmd.output()
            .map_err(|e| e.to_string())?;
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if path.is_empty() {
            Ok(None)
        } else {
            Ok(Some(path))
        }
    } else {
        Ok(None)
    }
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

#[tauri::command]
pub async fn set_stay_awake(enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        extern "system" {
            fn SetThreadExecutionState(esFlags: u32) -> u32;
        }
        const ES_CONTINUOUS: u32 = 0x80000000;
        const ES_DISPLAY_REQUIRED: u32 = 0x00000002;
        const ES_SYSTEM_REQUIRED: u32 = 0x00000001;

        let flags = if enabled {
            ES_CONTINUOUS | ES_DISPLAY_REQUIRED | ES_SYSTEM_REQUIRED
        } else {
            ES_CONTINUOUS
        };

        unsafe {
            SetThreadExecutionState(flags);
        }
    }
    Ok(())
}



