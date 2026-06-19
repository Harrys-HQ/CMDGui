mod project;
mod terminal;
mod settings;
mod file_op;

use terminal::TerminalState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(TerminalState::default())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      project::get_project_info,
      project::get_project_details,
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
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
