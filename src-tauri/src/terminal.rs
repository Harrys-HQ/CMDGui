use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize, ChildKiller};
use serde::Deserialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter, State};

pub struct TerminalSession {
    pub master: Box<dyn MasterPty + Send>,
    pub writer: Arc<Mutex<Box<dyn Write + Send>>>,
    pub killer: Arc<Mutex<Box<dyn ChildKiller + Send>>>,
}

impl Drop for TerminalSession {
    fn drop(&mut self) {
        if let Ok(mut killer) = self.killer.lock() {
            let _ = killer.kill();
        }
    }
}

#[derive(Default)]
pub struct TerminalState {
    pub sessions: Arc<Mutex<HashMap<String, TerminalSession>>>,
}

#[derive(Deserialize)]
pub struct CreateTerminalOptions {
    pub cols: Option<u16>,
    pub rows: Option<u16>,
    pub cwd: Option<String>,
    pub shell: Option<String>,
    pub env_vars: Option<HashMap<String, String>>,
}

#[tauri::command]
pub async fn create_terminal(
    app_handle: AppHandle,
    state: State<'_, TerminalState>,
    options: CreateTerminalOptions,
) -> Result<String, String> {
    let cols = options.cols.unwrap_or(80);
    let rows = options.rows.unwrap_or(30);

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open pty: {}", e))?;

    let default_shell = if cfg!(target_os = "windows") {
        let pwsh_7_path = r"C:\Program Files\PowerShell\7\pwsh.exe";
        if std::path::Path::new(pwsh_7_path).exists() {
            pwsh_7_path.to_string()
        } else {
            let system_root = std::env::var("SystemRoot")
                .or_else(|_| std::env::var("windir"))
                .unwrap_or_else(|_| "C:\\Windows".to_string());
            format!(r"{}\System32\WindowsPowerShell\v1.0\powershell.exe", system_root)
        }
    } else {
        "bash".to_string()
    };
    let mut shell_cmd = options.shell.unwrap_or(default_shell.clone());
    if shell_cmd.trim().is_empty() {
        shell_cmd = default_shell;
    } else if cfg!(target_os = "windows") {
        let lower = shell_cmd.to_lowercase();
        if lower == "powershell.exe" || lower == "powershell" {
            let system_root = std::env::var("SystemRoot")
                .or_else(|_| std::env::var("windir"))
                .unwrap_or_else(|_| "C:\\Windows".to_string());
            shell_cmd = format!(r"{}\System32\WindowsPowerShell\v1.0\powershell.exe", system_root);
        } else if lower == "pwsh.exe" || lower == "pwsh" {
            let pwsh_7_path = r"C:\Program Files\PowerShell\7\pwsh.exe";
            if std::path::Path::new(pwsh_7_path).exists() {
                shell_cmd = pwsh_7_path.to_string();
            } else {
                shell_cmd = "pwsh.exe".to_string();
            }
        } else if lower == "cmd.exe" || lower == "cmd" {
            let system_root = std::env::var("SystemRoot")
                .or_else(|_| std::env::var("windir"))
                .unwrap_or_else(|_| "C:\\Windows".to_string());
            shell_cmd = format!(r"{}\System32\cmd.exe", system_root);
        } else if lower == "bash.exe" || lower == "git-bash" {
            let git_bash = r"C:\Program Files\Git\bin\bash.exe";
            if std::path::Path::new(git_bash).exists() {
                shell_cmd = git_bash.to_string();
            } else {
                shell_cmd = "bash.exe".to_string();
            }
        }
    }

    let mut cmd = CommandBuilder::new(&shell_cmd);
    if let Some(cwd) = options.cwd {
        if !cwd.is_empty() {
            cmd.cwd(cwd);
        }
    }

    // Explicitly inherit all environment variables from the current process
    for (k, v) in std::env::vars() {
        cmd.env(k, v);
    }

    #[cfg(target_os = "windows")]
    {
        let mut path_val = std::env::vars()
            .find(|(k, _)| k.eq_ignore_ascii_case("path"))
            .map(|(_, v)| v)
            .unwrap_or_default();
        if let Some(home) = std::env::var_os("USERPROFILE") {
            let home_str = home.to_string_lossy();
            let npm_path = format!(r"{}\AppData\Roaming\npm", home_str);
            let agy_path = format!(r"{}\AppData\Local\agy\bin", home_str);
            
            if !path_val.to_lowercase().contains(&npm_path.to_lowercase()) {
                if !path_val.is_empty() { path_val.push(';'); }
                path_val.push_str(&npm_path);
            }
            if !path_val.to_lowercase().contains(&agy_path.to_lowercase()) {
                if !path_val.is_empty() { path_val.push(';'); }
                path_val.push_str(&agy_path);
            }
        }
        // Find all case-insensitive variations of "PATH" currently in the environment
        // and update them to the new path_val to avoid duplicate/conflicting entries.
        let mut found = false;
        for (k, _) in std::env::vars() {
            if k.eq_ignore_ascii_case("path") {
                cmd.env(&k, &path_val);
                found = true;
            }
        }
        if !found {
            cmd.env("Path", &path_val);
        }
    }

    if let Some(env) = options.env_vars {
        for (k, v) in env {
            cmd.env(k, v);
        }
    }

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn command: {}", e))?;

    let killer = child.clone_killer();

    // Drop the slave end so that the only open descriptor is the child process's.
    // This is important to ensure EOF is detected when the child exits.
    drop(pair.slave);

    let master = pair.master;
    let mut reader = master
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone reader: {}", e))?;
    let writer = master
        .take_writer()
        .map_err(|e| format!("Failed to take writer: {}", e))?;

    // Generate a random string ID or use a counter. For simplicity, we can use a UUID-like representation
    // or timestamp + random. Let's use a timestamp + counter.
    static COUNTER: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);
    let pid = format!(
        "{}-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis(),
        COUNTER.fetch_add(1, std::sync::atomic::Ordering::SeqCst)
    );

    let pid_clone = pid.clone();
    let app_handle_clone = app_handle.clone();
    let sessions_clone = state.sessions.clone();

    // Spawn a thread to read output from the PTY master
    thread::spawn(move || {
        let mut buffer = [0u8; 8192];
        loop {
            match reader.read(&mut buffer) {
                Ok(n) if n > 0 => {
                    let data = String::from_utf8_lossy(&buffer[..n]).to_string();
                    app_handle_clone
                        .emit(
                            &format!("terminal-incoming-{}", pid_clone),
                            data,
                        )
                        .ok();
                }
                _ => {
                    // Reader EOF or error (shell process exited)
                    app_handle_clone
                        .emit(&format!("terminal-exit-{}", pid_clone), ())
                        .ok();
                    
                    // Remove session from map to free memory and resources
                    if let Ok(mut sessions) = sessions_clone.lock() {
                        sessions.remove(&pid_clone);
                    }
                    break;
                }
            }
        }
    });

    let session = TerminalSession {
        master,
        writer: Arc::new(Mutex::new(writer)),
        killer: Arc::new(Mutex::new(killer)),
    };

    let mut sessions = state.sessions.lock().unwrap();
    sessions.insert(pid.clone(), session);

    Ok(pid)
}

#[tauri::command]
pub async fn write_terminal(
    state: State<'_, TerminalState>,
    pid: String,
    data: String,
) -> Result<(), String> {
    let sessions = state.sessions.lock().unwrap();
    if let Some(session) = sessions.get(&pid) {
        let mut writer = session.writer.lock().unwrap();
        writer
            .write_all(data.as_bytes())
            .map_err(|e| format!("Failed to write to terminal: {}", e))?;
        writer
            .flush()
            .map_err(|e| format!("Failed to flush terminal write: {}", e))?;
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
pub async fn resize_terminal(
    state: State<'_, TerminalState>,
    pid: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let sessions = state.sessions.lock().unwrap();
    if let Some(session) = sessions.get(&pid) {
        session
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to resize terminal: {}", e))?;
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
pub async fn kill_terminal(state: State<'_, TerminalState>, pid: String) -> Result<(), String> {
    let mut sessions = state.sessions.lock().unwrap();
    if let Some(session) = sessions.remove(&pid) {
        if let Ok(mut killer) = session.killer.lock() {
            let _ = killer.kill();
        }
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
pub async fn kill_all_terminals(state: State<'_, TerminalState>) -> Result<(), String> {
    let mut sessions = state.sessions.lock().unwrap();
    for session in sessions.values() {
        if let Ok(mut killer) = session.killer.lock() {
            let _ = killer.kill();
        }
    }
    sessions.clear();
    Ok(())
}
