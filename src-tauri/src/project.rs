use std::collections::{HashMap, BTreeMap};
use std::fs;
use std::path::Path;
use std::process::Command;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDetails {
    pub r#type: String,
    pub scripts: BTreeMap<String, String>,
    pub env_vars: BTreeMap<String, String>,
    pub git_branch: Option<String>,
    pub git_dirty: bool,
    pub git_files: Vec<String>,
}

#[tauri::command]
pub async fn get_project_info(project_path: String) -> String {
    let path = Path::new(&project_path);
    if !path.exists() {
        return "folder".to_string();
    }

    let read_dir = match fs::read_dir(path) {
        Ok(dir) => dir,
        Err(_) => return "folder".to_string(),
    };

    let mut files = Vec::new();
    for entry in read_dir {
        if let Ok(entry) = entry {
            if let Some(name) = entry.file_name().to_str() {
                files.push(name.to_lowercase());
            }
        }
    }

    if files.contains(&"package.json".to_string()) {
        let pkg_path = path.join("package.json");
        if let Ok(content) = fs::read_to_string(pkg_path) {
            if let Ok(pkg) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(deps) = get_all_deps(&pkg) {
                    if deps.contains_key("react") || deps.contains_key("next") {
                        return "react".to_string();
                    }
                    if deps.contains_key("vue") || deps.contains_key("nuxt") {
                        return "vue".to_string();
                    }
                    if deps.contains_key("@angular/core") {
                        return "angular".to_string();
                    }
                    if deps.contains_key("svelte") {
                        return "svelte".to_string();
                    }
                }
                if files.contains(&"vite.config.ts".to_string()) || files.contains(&"vite.config.js".to_string()) {
                    return "react".to_string();
                }
                return "node".to_string();
            }
        }
    }

    if files.contains(&"deno.json".to_string()) || files.contains(&"deno.jsonc".to_string()) {
        return "deno".to_string();
    }
    if files.contains(&"requirements.txt".to_string()) || files.contains(&"pyproject.toml".to_string()) || files.iter().any(|f| f.ends_with(".py")) {
        return "python".to_string();
    }
    if files.contains(&"cargo.toml".to_string()) {
        return "rust".to_string();
    }
    if files.contains(&"go.mod".to_string()) {
        return "go".to_string();
    }
    if files.contains(&"composer.json".to_string()) {
        return "php".to_string();
    }
    if files.contains(&"gemfile".to_string()) || files.iter().any(|f| f.ends_with(".rb")) {
        return "ruby".to_string();
    }
    if files.contains(&"pom.xml".to_string()) || files.contains(&"build.gradle".to_string()) || files.iter().any(|f| f.ends_with(".java")) {
        return "java".to_string();
    }
    if files.contains(&"dockerfile".to_string()) || files.contains(&"docker-compose.yml".to_string()) {
        return "docker".to_string();
    }
    if files.iter().any(|f| f.ends_with(".sln") || f.ends_with(".csproj")) {
        return "dotnet".to_string();
    }
    if files.iter().any(|f| f.ends_with(".cpp") || f.ends_with(".hpp") || f.ends_with(".cc")) {
        return "cpp".to_string();
    }
    if files.contains(&".git".to_string()) {
        return "git".to_string();
    }

    "folder".to_string()
}

fn get_all_deps(pkg: &serde_json::Value) -> Option<HashMap<String, serde_json::Value>> {
    let mut all_deps = HashMap::new();
    if let Some(deps) = pkg.get("dependencies").and_then(|d| d.as_object()) {
        for (k, v) in deps {
            all_deps.insert(k.clone(), v.clone());
        }
    }
    if let Some(dev_deps) = pkg.get("devDependencies").and_then(|d| d.as_object()) {
        for (k, v) in dev_deps {
            all_deps.insert(k.clone(), v.clone());
        }
    }
    if all_deps.is_empty() {
        None
    } else {
        Some(all_deps)
    }
}

#[tauri::command]
pub async fn get_project_details(project_path: String) -> ProjectDetails {
    let mut details = ProjectDetails {
        r#type: "folder".to_string(),
        scripts: BTreeMap::new(),
        env_vars: BTreeMap::new(),
        git_branch: None,
        git_dirty: false,
        git_files: Vec::new(),
    };

    let path = Path::new(&project_path);
    if !path.exists() {
        return details;
    }

    let read_dir = match fs::read_dir(path) {
        Ok(dir) => dir,
        Err(_) => return details,
    };

    let mut files = Vec::new();
    for entry in read_dir {
        if let Ok(entry) = entry {
            if let Some(name) = entry.file_name().to_str() {
                files.push(name.to_lowercase());
            }
        }
    }

    // 0. Parse .env
    if files.contains(&".env".to_string()) {
        let env_path = path.join(".env");
        if let Ok(content) = fs::read_to_string(env_path) {
            for line in content.lines() {
                let trimmed = line.trim();
                if !trimmed.is_empty() && !trimmed.starts_with('#') {
                    if let Some(idx) = trimmed.find('=') {
                        let key = trimmed[..idx].trim().to_string();
                        let val = trimmed[idx + 1..].trim().to_string();
                        details.env_vars.insert(key, val);
                    }
                }
            }
        }
    }

    // 1. Determine Type & Scripts
    if files.contains(&"package.json".to_string()) {
        let pkg_path = path.join("package.json");
        if let Ok(content) = fs::read_to_string(pkg_path) {
            if let Ok(pkg) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(scripts_val) = pkg.get("scripts").and_then(|s| s.as_object()) {
                    for (k, v) in scripts_val {
                        if let Some(v_str) = v.as_str() {
                            details.scripts.insert(k.clone(), v_str.to_string());
                        }
                    }
                }
                details.r#type = "node".to_string();
                if let Some(deps) = get_all_deps(&pkg) {
                    if deps.contains_key("react") || deps.contains_key("next") {
                        details.r#type = "react".to_string();
                    } else if deps.contains_key("vue") || deps.contains_key("nuxt") {
                        details.r#type = "vue".to_string();
                    } else if deps.contains_key("@angular/core") {
                        details.r#type = "angular".to_string();
                    } else if deps.contains_key("svelte") {
                        details.r#type = "svelte".to_string();
                    }
                }
                if details.r#type == "node" && (files.contains(&"vite.config.ts".to_string()) || files.contains(&"vite.config.js".to_string())) {
                    details.r#type = "react".to_string();
                }
            }
        }
    } else if files.contains(&"deno.json".to_string()) || files.contains(&"deno.jsonc".to_string()) {
        details.r#type = "deno".to_string();
    } else if files.contains(&"requirements.txt".to_string()) || files.contains(&"pyproject.toml".to_string()) || files.iter().any(|f| f.ends_with(".py")) {
        details.r#type = "python".to_string();
        details.scripts.insert("run".to_string(), "python main.py".to_string());
        details.scripts.insert("pip".to_string(), "pip install -r requirements.txt".to_string());
    } else if files.contains(&"cargo.toml".to_string()) {
        details.r#type = "rust".to_string();
        details.scripts.insert("build".to_string(), "cargo build".to_string());
        details.scripts.insert("run".to_string(), "cargo run".to_string());
        details.scripts.insert("test".to_string(), "cargo test".to_string());
        details.scripts.insert("check".to_string(), "cargo check".to_string());
    } else if files.contains(&"go.mod".to_string()) {
        details.r#type = "go".to_string();
        details.scripts.insert("build".to_string(), "go build".to_string());
        details.scripts.insert("run".to_string(), "go run .".to_string());
        details.scripts.insert("test".to_string(), "go test ./...".to_string());
    } else if files.contains(&"composer.json".to_string()) {
        let comp_path = path.join("composer.json");
        if let Ok(content) = fs::read_to_string(comp_path) {
            if content.contains("laravel/framework") {
                details.r#type = "laravel".to_string();
            } else {
                details.r#type = "php".to_string();
            }
        } else {
            details.r#type = "php".to_string();
        }
    } else if files.contains(&"gemfile".to_string()) || files.iter().any(|f| f.ends_with(".rb")) {
        details.r#type = "ruby".to_string();
    } else if files.contains(&"pom.xml".to_string()) || files.contains(&"build.gradle".to_string()) || files.iter().any(|f| f.ends_with(".java")) {
        details.r#type = "java".to_string();
    } else if files.contains(&"dockerfile".to_string()) || files.contains(&"docker-compose.yml".to_string()) {
        details.r#type = "docker".to_string();
        if files.contains(&"docker-compose.yml".to_string()) {
            details.scripts.insert("up".to_string(), "docker-compose up".to_string());
            details.scripts.insert("down".to_string(), "docker-compose down".to_string());
            details.scripts.insert("build".to_string(), "docker-compose build".to_string());
        } else {
            details.scripts.insert("build".to_string(), "docker build -t app .".to_string());
            details.scripts.insert("run".to_string(), "docker run app".to_string());
        }
    } else if files.iter().any(|f| f.ends_with(".sln") || f.ends_with(".csproj")) {
        details.r#type = "dotnet".to_string();
    } else if files.iter().any(|f| f.ends_with(".cpp") || f.ends_with(".hpp") || f.ends_with(".cc")) {
        details.r#type = "cpp".to_string();
    } else if files.contains(&".git".to_string()) {
        details.r#type = "git".to_string();
    }

    // Makefile fallback for scripts
    if files.contains(&"makefile".to_string()) && details.scripts.is_empty() {
        let make_path = path.join("Makefile");
        if let Ok(content) = fs::read_to_string(make_path) {
            for line in content.lines() {
                if let Some(idx) = line.find(':') {
                    let target = line[..idx].trim();
                    if !target.is_empty() && !target.starts_with('.') && !target.starts_with('#') && !target.contains(' ') {
                        details.scripts.insert(target.to_string(), format!("make {}", target));
                    }
                }
            }
        }
    }

    // Git Status checking
    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let is_git = {
        let mut git_check = Command::new("git");
        git_check.args(&["rev-parse", "--is-inside-work-tree"])
            .current_dir(path);
        #[cfg(target_os = "windows")]
        git_check.creation_flags(CREATE_NO_WINDOW);
        
        git_check.output()
            .map(|out| out.status.success() && String::from_utf8_lossy(&out.stdout).trim() == "true")
            .unwrap_or(false)
    };

    if is_git {
        // Run branch
        let mut cmd = Command::new("git");
        cmd.args(&["branch", "--show-current"])
            .current_dir(path);
        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);

        if let Ok(out) = cmd.output() {
            if out.status.success() {
                let br = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !br.is_empty() {
                    details.git_branch = Some(br);
                }
            }
        }

        // Run status
        let mut cmd_status = Command::new("git");
        cmd_status.args(&["status", "--porcelain"])
            .current_dir(path);
        #[cfg(target_os = "windows")]
        cmd_status.creation_flags(CREATE_NO_WINDOW);

        if let Ok(out) = cmd_status.output() {
            if out.status.success() {
                let status_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !status_str.is_empty() {
                    details.git_dirty = true;
                    details.git_files = status_str
                        .lines()
                        .map(|line| line.trim().to_string())
                        .filter(|line| !line.is_empty())
                        .collect();
                }
            }
        }
    }

    details
}

#[tauri::command]
pub async fn git_stage_all(project_path: String) -> Result<String, String> {
    let path = Path::new(&project_path);
    if !path.exists() {
        return Err("Project path does not exist".to_string());
    }

    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut cmd = Command::new("git");
    cmd.args(&["add", "."])
        .current_dir(path);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    match cmd.output() {
        Ok(out) => {
            if out.status.success() {
                Ok("Staged all files successfully".to_string())
            } else {
                Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn git_commit(project_path: String, message: String) -> Result<String, String> {
    let path = Path::new(&project_path);
    if !path.exists() {
        return Err("Project path does not exist".to_string());
    }

    if message.trim().is_empty() {
        return Err("Commit message cannot be empty".to_string());
    }

    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut cmd = Command::new("git");
    cmd.args(&["commit", "-m", &message])
        .current_dir(path);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    match cmd.output() {
        Ok(out) => {
            if out.status.success() {
                Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
            } else {
                Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn git_pull(project_path: String) -> Result<String, String> {
    let path = Path::new(&project_path);
    if !path.exists() {
        return Err("Project path does not exist".to_string());
    }

    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut cmd = Command::new("git");
    cmd.args(&["pull"])
        .current_dir(path);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    match cmd.output() {
        Ok(out) => {
            if out.status.success() {
                Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
            } else {
                Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn git_push(project_path: String) -> Result<String, String> {
    let path = Path::new(&project_path);
    if !path.exists() {
        return Err("Project path does not exist".to_string());
    }

    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut cmd = Command::new("git");
    cmd.args(&["push"])
        .current_dir(path);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    match cmd.output() {
        Ok(out) => {
            if out.status.success() {
                Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
            } else {
                Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ActivePort {
    pub port: u16,
    pub pid: u32,
    pub process_name: String,
}

#[tauri::command]
pub async fn get_active_ports() -> Result<Vec<ActivePort>, String> {
    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        // 1. Build PID -> Process Name map using tasklist
        let mut pid_map = HashMap::new();
        let mut tasklist_cmd = Command::new("tasklist");
        tasklist_cmd.args(&["/NH", "/FO", "CSV"]);
        tasklist_cmd.creation_flags(CREATE_NO_WINDOW);

        if let Ok(output) = tasklist_cmd.output() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let line = line.trim();
                if line.starts_with('"') && line.ends_with('"') {
                    let parts: Vec<&str> = line[1..line.len()-1].split("\",\"").collect();
                    if parts.len() >= 2 {
                        let process_name = parts[0].to_string();
                        if let Ok(pid) = parts[1].parse::<u32>() {
                            pid_map.insert(pid, process_name);
                        }
                    }
                }
            }
        }

        // 2. Query netstat to find listening ports
        let mut active_ports = Vec::new();
        let mut netstat_cmd = Command::new("netstat");
        netstat_cmd.args(&["-ano", "-p", "tcp"]);
        netstat_cmd.creation_flags(CREATE_NO_WINDOW);

        if let Ok(output) = netstat_cmd.output() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let tokens: Vec<&str> = line.split_whitespace().collect();
                if tokens.len() >= 5 && tokens[0] == "TCP" && tokens[3] == "LISTENING" {
                    let local_addr = tokens[1];
                    let pid_str = tokens[4];

                    if let Some(port_str) = local_addr.split(':').last() {
                        if let (Ok(port), Ok(pid)) = (port_str.parse::<u16>(), pid_str.parse::<u32>()) {
                            let process_name = pid_map.get(&pid).cloned().unwrap_or_else(|| "Unknown".to_string());
                            
                            // Prevent duplicates
                            if !active_ports.iter().any(|ap: &ActivePort| ap.port == port) {
                                active_ports.push(ActivePort {
                                    port,
                                    pid,
                                    process_name,
                                });
                            }
                        }
                    }
                }
            }
        }

        // Sort ports numerically
        active_ports.sort_by_key(|ap| ap.port);
        Ok(active_ports)
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(Vec::new())
    }
}

#[tauri::command]
pub async fn kill_process_by_pid(pid: u32) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let mut cmd = Command::new("taskkill");
        cmd.args(&["/F", "/PID", &pid.to_string()]);
        cmd.creation_flags(CREATE_NO_WINDOW);

        match cmd.output() {
            Ok(out) => {
                if out.status.success() {
                    Ok(format!("Successfully terminated process with PID {}", pid))
                } else {
                    Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
                }
            }
            Err(e) => Err(e.to_string()),
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Unsupported OS".to_string())
    }
}


