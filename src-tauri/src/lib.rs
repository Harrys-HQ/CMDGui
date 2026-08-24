mod project;
mod terminal;
mod settings;
mod file_op;

use terminal::TerminalState;
use tauri::{Emitter, Manager};

#[tauri::command]
fn get_launch_args() -> Vec<String> {
  std::env::args().collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  #[cfg(target_os = "windows")]
  {
    let system_root = std::env::var("SystemRoot")
        .or_else(|_| std::env::var("windir"))
        .unwrap_or_else(|_| "C:\\Windows".to_string());
    
    let path_val = std::env::var("PATH").unwrap_or_default();
    
    let sys32 = format!(r"{}\System32", system_root);
    let sys32_wbem = format!(r"{}\System32\Wbem", system_root);
    let sys32_powershell = format!(r"{}\System32\WindowsPowerShell\v1.0", system_root);
    
    let paths_to_ensure = vec![
        system_root,
        sys32,
        sys32_wbem,
        sys32_powershell,
    ];
    
    let mut paths: Vec<std::path::PathBuf> = std::env::split_paths(&path_val).collect();
    let mut modified = false;
    for p_str in paths_to_ensure {
        let p = std::path::PathBuf::from(&p_str);
        if !paths.iter().any(|existing| existing.to_string_lossy().eq_ignore_ascii_case(&p_str)) {
            paths.push(p);
            modified = true;
        }
    }
    
    if modified {
        if let Ok(new_path) = std::env::join_paths(paths) {
            std::env::set_var("PATH", new_path);
        }
    }
  }

  tauri::Builder::default()
    .manage(TerminalState::default())
    .manage(file_op::StayAwakeState::default())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      #[cfg(desktop)]
      app.handle().plugin(tauri_plugin_single_instance::init(|app_handle, argv, cwd| {
        let _ = app_handle.emit("single-instance", (argv, cwd));
        if let Some(window) = app_handle.get_webview_window("main") {
          let _ = window.unminimize();
          let _ = window.show();
          let _ = window.set_focus();
        }
      }))?;
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
      }
      #[cfg(desktop)]
      app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
      #[cfg(desktop)]
      app.handle().plugin(tauri_plugin_process::init())?;
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      get_launch_args,
      project::get_project_info,
      project::get_project_details,
      project::git_stage_all,
      project::git_commit,
      project::git_pull,
      project::git_push,
      project::get_active_ports,
      project::kill_process_by_pid,
      terminal::create_terminal,
      terminal::write_terminal,
      terminal::resize_terminal,
      terminal::kill_terminal,
      terminal::kill_all_terminals,
      settings::settings_get,
      settings::settings_set,
      file_op::file_create,
      file_op::file_mkdir,
      file_op::file_rename,
      file_op::file_delete,
      file_op::file_show_in_folder,
      file_op::fs_list_directory,
      file_op::shell_open_path,
      file_op::app_check_admin,
      file_op::app_relaunch_admin,
      file_op::dialog_select_folder,
      file_op::open_in_vscode,
      file_op::set_stay_awake,
      file_op::read_clipboard,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
