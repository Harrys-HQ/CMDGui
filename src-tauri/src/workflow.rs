//! Bounded, local CLI orchestration. PTYs and model-generated shell commands are
//! deliberately outside this runner: only the user's saved checks use a shell.
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::{hash_map::DefaultHasher, HashMap},
    fs,
    hash::{Hash, Hasher},
    io::Read,
    path::{Component, Path, PathBuf},
    process::Stdio,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::State;
use tokio::{
    io::{AsyncBufReadExt, AsyncRead, AsyncReadExt, AsyncWriteExt, BufReader},
    process::Command,
};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelChoice {
    id: String,
    label: String,
    efforts: Vec<String>,
}

#[tauri::command]
pub async fn workflow_models(provider: String) -> Result<Vec<ModelChoice>, String> {
    if provider == "agy" {
        let mut child = command(&executable("agy")?)
            .arg("models")
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .stdin(Stdio::null())
            .kill_on_drop(true)
            .spawn()
            .map_err(|e| e.to_string())?;
        let tree = ProcessTree::attach(&child)?;
        let stdout = child.stdout.take().ok_or("Missing catalog output")?;
        let result = tokio::time::timeout(Duration::from_secs(20), async {
            let mut text = String::new();
            stdout
                .take(1024 * 1024)
                .read_to_string(&mut text)
                .await
                .map_err(|e| e.to_string())?;
            let status = child.wait().await.map_err(|e| e.to_string())?;
            let choices: Vec<_> = text
                .lines()
                .filter_map(|line| {
                    let (id, label) = line.split_once('\t')?;
                    Some(ModelChoice {
                        id: id.into(),
                        label: label.into(),
                        efforts: vec![],
                    })
                })
                .collect();
            if !status.success() || choices.is_empty() {
                return Err("AGY returned no models. Open AGY and sign in first.".into());
            }
            Ok(choices)
        })
        .await
        .map_err(|_| "AGY model catalog timed out".to_string())
        .and_then(|r| r);
        drop(tree);
        let _ = child.kill().await;
        return result;
    }
    if provider != "codex" {
        return Err("Unknown model provider".into());
    }
    let mut child = command(&executable("codex")?)
        .args(["app-server", "--listen", "stdio://"])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| e.to_string())?;
    let tree = ProcessTree::attach(&child)?;
    let mut stdin = child.stdin.take().ok_or("Missing catalog input")?;
    let mut stdout = BufReader::new(child.stdout.take().ok_or("Missing catalog output")?).lines();
    let result = tokio::time::timeout(Duration::from_secs(20), async {
        let initialize = json!({"method":"initialize","id":1,"params":{"clientInfo":{"name":"cmdgui","title":"CmdGUI","version":env!("CARGO_PKG_VERSION")}}});
        stdin.write_all(format!("{initialize}\n").as_bytes()).await.map_err(|e| e.to_string())?;
        let mut total = 0;
        while let Some(line) = stdout.next_line().await.map_err(|e| e.to_string())? {
            total += line.len();
            if total > 1024 * 1024 { return Err("Codex catalog response exceeded its limit".into()); }
            let Ok(message) = serde_json::from_str::<Value>(&line) else { continue; };
            if message.get("id").and_then(Value::as_u64) == Some(1) {
                if message.get("error").is_some() { return Err("Codex initialization failed".into()); }
                stdin.write_all(b"{\"method\":\"initialized\"}\n{\"method\":\"model/list\",\"id\":2,\"params\":{\"limit\":100,\"includeHidden\":false}}\n").await.map_err(|e| e.to_string())?;
            }
            if message.get("id").and_then(Value::as_u64) == Some(2) {
                let models = message["result"]["data"].as_array().ok_or("Codex returned no model catalog. Check your CLI login.")?;
                return Ok(models.iter().filter_map(|m| Some(ModelChoice {
                    id: m["model"].as_str()?.into(), label: m["displayName"].as_str().unwrap_or("Codex model").into(),
                    efforts: m["supportedReasoningEfforts"].as_array().map(|items| items.iter().filter_map(|e| e["reasoningEffort"].as_str().map(str::to_owned)).collect()).unwrap_or_default(),
                })).collect());
            }
        }
        Err("Codex closed its model catalog connection".into())
    }).await.map_err(|_| "Codex model catalog timed out".to_string()).and_then(|r| r);
    drop(tree);
    let _ = child.kill().await;
    result
}

const OUTPUT_LIMIT: usize = 8 * 1024 * 1024;
const TAIL_LIMIT: usize = 24 * 1024;

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct WorkflowOptions {
    cwd: String,
    prompt: String,
    mode: String,
    checks: Vec<String>,
    timeout_minutes: u64,
    agy_model: String,
    codex_model: String,
    #[serde(default)]
    codex_effort: String,
    #[serde(default)]
    task_type: String,
    #[serde(default)]
    routing_reason: String,
    #[serde(default)]
    session_id: Option<String>,
    #[serde(default)]
    session_context: String,
    #[serde(default)]
    resume_session: bool,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Usage {
    input_tokens: Option<u64>,
    cached_input_tokens: Option<u64>,
    output_tokens: Option<u64>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckResult {
    command: String,
    exit_code: Option<i32>,
    passed: bool,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowRun {
    id: String,
    options: WorkflowOptions,
    status: String,
    stage: String,
    started_at: u64,
    finished_at: Option<u64>,
    message: String,
    brief: Option<String>,
    summary: Option<String>,
    output: String,
    usage: Option<Usage>,
    checks: Vec<CheckResult>,
    artifact_dir: String,
    #[serde(default)]
    codex_session_id: Option<String>,
}

struct Store {
    runs: HashMap<String, WorkflowRun>,
    active: Option<(String, Arc<AtomicBool>)>,
}

#[derive(Clone)]
pub struct WorkflowState {
    store: Arc<Mutex<Store>>,
    root: PathBuf,
}

fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn save(run: &WorkflowRun) -> Result<(), String> {
    let dir = Path::new(&run.artifact_dir);
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let tmp = dir.join("run.tmp");
    fs::write(
        &tmp,
        serde_json::to_vec_pretty(run).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    fs::rename(tmp, dir.join("run.json")).map_err(|e| e.to_string())
}

impl WorkflowState {
    pub fn new() -> Self {
        Self::load(crate::settings::get_settings_path().with_file_name("workflows"))
    }

    fn load(root: PathBuf) -> Self {
        let mut runs = HashMap::new();
        if let Ok(entries) = fs::read_dir(&root) {
            for entry in entries.flatten() {
                if let Ok(data) = fs::read(entry.path().join("run.json")) {
                    if let Ok(mut run) = serde_json::from_slice::<WorkflowRun>(&data) {
                        if run.status == "running" {
                            run.status = "interrupted".into();
                            run.finished_at = Some(now());
                            run.message = "CmdGUI stopped before this run finished. Review the working tree before starting another task.".into();
                            let _ = save(&run);
                        }
                        runs.insert(run.id.clone(), run);
                    }
                }
            }
        }
        Self {
            store: Arc::new(Mutex::new(Store { runs, active: None })),
            root,
        }
    }

    fn update(&self, id: &str, change: impl FnOnce(&mut WorkflowRun)) -> Result<(), String> {
        let mut store = self.store.lock().map_err(|e| e.to_string())?;
        let run = store.runs.get_mut(id).ok_or("Run not found")?;
        change(run);
        save(run)
    }

    fn output(&self, id: &str, text: &str) {
        if let Ok(mut store) = self.store.lock() {
            if let Some(run) = store.runs.get_mut(id) {
                run.output.push_str(text);
                if run.output.len() > TAIL_LIMIT {
                    let mut split = run.output.len() - TAIL_LIMIT;
                    while !run.output.is_char_boundary(split) {
                        split += 1;
                    }
                    run.output.drain(..split);
                }
            }
        }
    }
}

fn validate_options(options: &WorkflowOptions) -> Result<(), String> {
    if options.session_context.len() > 12000 {
        return Err("Imported session context exceeds 12 KB. Shorten the excerpt.".into());
    }
    if options.resume_session && options.session_id.is_none() {
        return Err("Select a Codex session before resuming.".into());
    }
    if let Some(id) = &options.session_id {
        if id.is_empty()
            || id.len() > 128
            || !id
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
        {
            return Err("Invalid session ID".into());
        }
    }
    if options.prompt.trim().is_empty() || options.prompt.len() > 8000 {
        return Err("Enter a task between 1 and 8,000 bytes.".into());
    }
    if !matches!(
        options.mode.as_str(),
        "pipeline" | "codex-only" | "agy-only"
    ) {
        return Err("Unknown workflow mode.".into());
    }
    if !(1..=120).contains(&options.timeout_minutes) {
        return Err("Stage timeout must be between 1 and 120 minutes.".into());
    }
    if options.checks.len() > 10
        || options
            .checks
            .iter()
            .any(|s| s.trim().is_empty() || s.len() > 2000)
    {
        return Err("Configure at most 10 nonempty checks, each under 2,000 bytes.".into());
    }
    if [&options.agy_model, &options.codex_model]
        .iter()
        .any(|s| s.len() > 128 || s.contains(['\n', '\r']))
    {
        return Err("Invalid model name.".into());
    }
    if !matches!(
        options.codex_effort.as_str(),
        "" | "low" | "medium" | "high" | "xhigh"
    ) {
        return Err("Unsupported reasoning effort.".into());
    }
    if options.task_type.len() > 100 || options.routing_reason.len() > 1000 {
        return Err("Invalid task metadata".into());
    }
    Ok(())
}

#[tauri::command]
pub async fn workflow_list(state: State<'_, WorkflowState>) -> Result<Vec<WorkflowRun>, String> {
    let store = state.store.lock().map_err(|e| e.to_string())?;
    let mut runs: Vec<_> = store.runs.values().cloned().collect();
    runs.sort_by(|a, b| b.started_at.cmp(&a.started_at));
    Ok(runs)
}

#[tauri::command]
pub async fn workflow_start(
    state: State<'_, WorkflowState>,
    mut options: WorkflowOptions,
) -> Result<WorkflowRun, String> {
    validate_options(&options)?;
    let cwd =
        fs::canonicalize(&options.cwd).map_err(|e| format!("Cannot open project folder: {e}"))?;
    if !cwd.is_dir() {
        return Err("Select a project folder.".into());
    }
    options.cwd = cwd.to_string_lossy().into_owned();
    let mut store = state.store.lock().map_err(|e| e.to_string())?;
    if store.active.is_some() {
        return Err("Another workflow is running. Cancel it or wait for it to finish.".into());
    }
    let id = format!(
        "{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos()
    );
    let run = WorkflowRun {
        artifact_dir: state.root.join(&id).to_string_lossy().into_owned(),
        codex_session_id: None,
        id: id.clone(),
        options,
        status: "running".into(),
        stage: "preflight".into(),
        started_at: now(),
        finished_at: None,
        message: "Checking project and CLI availability…".into(),
        brief: None,
        summary: None,
        output: String::new(),
        usage: None,
        checks: vec![],
    };
    save(&run)?;
    let cancel = Arc::new(AtomicBool::new(false));
    store.active = Some((id.clone(), cancel.clone()));
    store.runs.insert(id.clone(), run.clone());
    drop(store);
    let runner = state.inner().clone();
    let task = run.clone();
    tauri::async_runtime::spawn(async move {
        let result = execute(&runner, &task, &cancel).await;
        let cancelled = cancel.load(Ordering::SeqCst);
        let update = runner.update(&task.id, |r| finish_run(r, result, cancelled));
        if let Err(error) = update {
            log::error!("Unable to persist workflow result: {error}");
        }
        if let Ok(mut store) = runner.store.lock() {
            store.active = None;
        }
    });
    Ok(run)
}

fn finish_run(run: &mut WorkflowRun, result: Result<(), String>, cancelled: bool) {
    run.finished_at = Some(now());
    match result {
        Ok(()) if !cancelled => {
            let checked = !run.options.checks.is_empty()
                && run.checks.len() == run.options.checks.len()
                && run.checks.iter().all(|c| c.passed);
            run.status = if run.options.mode == "agy-only" {
                "planned"
            } else if checked {
                "verified"
            } else {
                "needs-review"
            }
            .into();
            run.message = if run.options.mode == "agy-only" {
                "Investigation complete. The saved brief is ready for review; implementation was not requested.".into()
            } else if checked {
                "Implementation finished and all configured checks passed.".into()
            } else {
                "Implementation finished. Validation is incomplete; review and validate the changes.".into()
            };
        }
        result => {
            run.status = if cancelled { "cancelled" } else { "failed" }.into();
            run.message = if cancelled {
                "Run cancelled. Existing edits are kept; review the working tree.".into()
            } else {
                result.err().unwrap_or_else(|| "Run stopped".into())
            };
        }
    }
}

#[tauri::command]
pub async fn workflow_cancel(state: State<'_, WorkflowState>, id: String) -> Result<(), String> {
    let store = state.store.lock().map_err(|e| e.to_string())?;
    match &store.active {
        Some((active_id, cancel)) if active_id == &id => {
            cancel.store(true, Ordering::SeqCst);
            Ok(())
        }
        _ => Err("This run is no longer active.".into()),
    }
}

#[tauri::command]
pub async fn workflow_open_artifacts(
    state: State<'_, WorkflowState>,
    id: String,
) -> Result<(), String> {
    let path = {
        let store = state.store.lock().map_err(|e| e.to_string())?;
        store
            .runs
            .get(&id)
            .ok_or("Run not found")?
            .artifact_dir
            .clone()
    };
    crate::file_op::shell_open_path(path).await.map(|_| ())
}

// Closing the job kills every descendant, including workers that outlive the
// CLI parent. The handle is never inherited. It is also closed on app exit.
#[cfg(windows)]
pub(crate) struct ProcessTree(isize);

#[cfg(windows)]
impl ProcessTree {
    pub(crate) fn attach(child: &tokio::process::Child) -> Result<Self, String> {
        use windows_sys::Win32::{
            Foundation::CloseHandle,
            System::{JobObjects::*, Threading::*},
        };
        // SAFETY: Handles are checked, exclusively owned and closed on every path.
        unsafe {
            let job = CreateJobObjectW(std::ptr::null(), std::ptr::null());
            if job.is_null() {
                return Err(std::io::Error::last_os_error().to_string());
            }
            let guard = Self(job as isize);
            let mut limits: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = std::mem::zeroed();
            limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            if SetInformationJobObject(
                job,
                JobObjectExtendedLimitInformation,
                &limits as *const _ as *const _,
                std::mem::size_of_val(&limits) as u32,
            ) == 0
            {
                return Err(std::io::Error::last_os_error().to_string());
            }
            let process = OpenProcess(
                PROCESS_SET_QUOTA | PROCESS_TERMINATE,
                0,
                child.id().ok_or("Worker already exited")?,
            );
            if process.is_null() {
                return Err(std::io::Error::last_os_error().to_string());
            }
            let assigned = AssignProcessToJobObject(job, process);
            let error = std::io::Error::last_os_error();
            CloseHandle(process);
            if assigned == 0 {
                return Err(format!("Cannot contain worker process tree: {error}"));
            }
            Ok(guard)
        }
    }
}

#[cfg(windows)]
impl Drop for ProcessTree {
    fn drop(&mut self) {
        // SAFETY: This guard exclusively owns a valid kernel job handle.
        unsafe {
            windows_sys::Win32::Foundation::CloseHandle(self.0 as _);
        }
    }
}

#[cfg(unix)]
pub(crate) struct ProcessTree(u32);
#[cfg(unix)]
impl ProcessTree {
    pub(crate) fn attach(child: &tokio::process::Child) -> Result<Self, String> {
        Ok(Self(child.id().ok_or("Worker already exited")?))
    }
}
#[cfg(unix)]
impl Drop for ProcessTree {
    fn drop(&mut self) {
        let _ = std::process::Command::new("kill")
            .args(["-KILL", "--", &format!("-{}", self.0)])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
}

pub(crate) fn command(program: &Path) -> Command {
    let mut cmd = Command::new(program);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        cmd.as_std_mut().process_group(0);
    }
    cmd
}

pub(crate) fn executable(name: &str) -> Result<PathBuf, String> {
    let filename = if cfg!(windows) {
        format!("{name}.exe")
    } else {
        name.into()
    };
    let mut dirs: Vec<PathBuf> = std::env::var_os("PATH")
        .map(|p| std::env::split_paths(&p).collect())
        .unwrap_or_default();
    if let Some(home) = std::env::var_os("USERPROFILE").or_else(|| std::env::var_os("HOME")) {
        let home = PathBuf::from(home);
        dirs.extend([
            home.join("AppData/Local/agy/bin"),
            home.join("AppData/Local/Programs/OpenAI/Codex/bin"),
            home.join(".local/bin"),
            home.join(".cargo/bin"),
        ]);
    }
    dirs.into_iter()
        .map(|p| p.join(&filename))
        .find(|p| p.is_file())
        .ok_or_else(|| {
            format!("{filename} was not found. Install the CLI and sign in before starting a run.")
        })
}

#[derive(Debug)]
struct ProcessResult {
    code: Option<i32>,
    stdout: String,
}

async fn read_output<R: AsyncRead + Unpin>(
    mut stream: R,
    state: WorkflowState,
    id: String,
) -> Result<String, String> {
    let mut output = Vec::new();
    let mut buffer = [0u8; 4096];
    loop {
        let count = stream.read(&mut buffer).await.map_err(|e| e.to_string())?;
        if count == 0 {
            break;
        }
        if output.len() + count > OUTPUT_LIMIT {
            return Err("Process output exceeded the 8 MiB limit.".into());
        }
        output.extend_from_slice(&buffer[..count]);
        state.output(&id, &String::from_utf8_lossy(&buffer[..count]));
    }
    Ok(String::from_utf8_lossy(&output).into_owned())
}

async fn run_process(
    state: &WorkflowState,
    run: &WorkflowRun,
    cancel: &AtomicBool,
    program: &Path,
    args: &[String],
    input: Option<&str>,
    label: &str,
) -> Result<ProcessResult, String> {
    if cancel.load(Ordering::SeqCst) {
        return Err("Cancelled".into());
    }
    state.output(&run.id, &format!("\n--- {label} ---\n"));
    let mut child = command(program)
        .args(args)
        .current_dir(&run.options.cwd)
        .stdin(if input.is_some() {
            Stdio::piped()
        } else {
            Stdio::null()
        })
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Could not start {label}: {e}"))?;
    let mut tree = Some(match ProcessTree::attach(&child) {
        Ok(tree) => tree,
        Err(error) => {
            let _ = child.kill().await;
            return Err(error);
        }
    });
    let stdout = child.stdout.take().ok_or("Missing stdout")?;
    let stderr = child.stderr.take().ok_or("Missing stderr")?;
    let mut out = tokio::spawn(read_output(stdout, state.clone(), run.id.clone()));
    let mut err = tokio::spawn(read_output(stderr, state.clone(), run.id.clone()));
    let stdin = child.stdin.take();
    let input = input.map(str::to_owned);
    let mut writer = tokio::spawn(async move {
        if let (Some(mut stdin), Some(input)) = (stdin, input) {
            stdin
                .write_all(input.as_bytes())
                .await
                .map_err(|e| e.to_string())?;
            stdin.shutdown().await.map_err(|e| e.to_string())?;
        }
        Ok::<_, String>(())
    });
    let deadline =
        tokio::time::Instant::now() + Duration::from_secs(run.options.timeout_minutes * 60);
    // Drain both pipes concurrently with wait/cancel. Reader failures also stop
    // the process, so a chatty worker cannot block forever on a full pipe.
    let result = async {
        let mut captured_out = None;
        let mut captured_err = None;
        let status = loop {
            if cancel.load(Ordering::SeqCst) {
                return Err("Cancelled".into());
            }
            if tokio::time::Instant::now() >= deadline {
                return Err(format!("{label} timed out."));
            }
            if captured_out.is_none() && out.is_finished() {
                captured_out = Some((&mut out).await.map_err(|e| e.to_string())??);
            }
            if captured_err.is_none() && err.is_finished() {
                captured_err = Some((&mut err).await.map_err(|e| e.to_string())??);
            }
            if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
                break status;
            }
            tokio::time::sleep(Duration::from_millis(100)).await;
        };
        // The handoff owns the whole worker tree, not just its parent CLI.
        // Close descendants before collecting the last bytes and starting Codex.
        drop(tree.take());
        let remaining = deadline
            .saturating_duration_since(tokio::time::Instant::now())
            .min(Duration::from_secs(3));
        let stdout = match captured_out {
            Some(text) => text,
            None => tokio::time::timeout(remaining, &mut out)
                .await
                .map_err(|_| "Output stream did not close".to_string())?
                .map_err(|e| e.to_string())??,
        };
        let stderr = match captured_err {
            Some(text) => text,
            None => tokio::time::timeout(remaining, &mut err)
                .await
                .map_err(|_| "Error stream did not close".to_string())?
                .map_err(|e| e.to_string())??,
        };
        let _ = tokio::time::timeout(Duration::from_secs(1), &mut writer).await;
        fs::write(
            Path::new(&run.artifact_dir).join(format!("{label}.stdout.log")),
            &stdout,
        )
        .map_err(|e| e.to_string())?;
        fs::write(
            Path::new(&run.artifact_dir).join(format!("{label}.stderr.log")),
            &stderr,
        )
        .map_err(|e| e.to_string())?;
        Ok(ProcessResult {
            code: status.code(),
            stdout,
        })
    }
    .await;
    if result.is_err() {
        drop(tree.take());
        let _ = child.kill().await;
        let _ = child.wait().await;
    }
    out.abort();
    err.abort();
    writer.abort();
    result
}

async fn git(cwd: &str, args: &[&str]) -> Result<Vec<u8>, String> {
    let result = command(Path::new("git"))
        .args(args)
        .current_dir(cwd)
        .output()
        .await
        .map_err(|e| e.to_string())?;
    if !result.status.success() {
        return Err(format!(
            "Git check failed: {}",
            String::from_utf8_lossy(&result.stderr)
        ));
    }
    Ok(result.stdout)
}

async fn fingerprint(cwd: &str) -> Result<String, String> {
    let mut hash = DefaultHasher::new();
    // Includes tracked edits, staging, deletions and untracked file contents;
    // ignored build outputs do not invalidate a handoff.
    git(cwd, &["rev-parse", "HEAD"]).await?.hash(&mut hash);
    git(cwd, &["diff", "--cached", "--binary"])
        .await?
        .hash(&mut hash);
    git(cwd, &["diff", "--binary"]).await?.hash(&mut hash);
    let files = git(cwd, &["ls-files", "-c", "-o", "--exclude-standard", "-z"]).await?;
    let root = fs::canonicalize(cwd).map_err(|e| e.to_string())?;
    let mut paths: Vec<_> = files.split(|b| *b == 0).filter(|p| !p.is_empty()).collect();
    paths.sort();
    paths.dedup();
    for file in paths {
        file.hash(&mut hash);
        let relative = std::str::from_utf8(file).map_err(|_| "Non-UTF-8 repository path")?;
        let path = root.join(relative);
        if !path.exists() {
            "deleted".hash(&mut hash);
            continue;
        }
        let resolved = fs::canonicalize(&path).map_err(|e| e.to_string())?;
        if !resolved.starts_with(&root) {
            return Err(format!("Repository link leaves the project: {relative}"));
        }
        if resolved.is_dir() {
            continue;
        } // git submodule
        let mut input = fs::File::open(&resolved).map_err(|e| e.to_string())?;
        let mut buffer = [0u8; 65536];
        loop {
            let count = input.read(&mut buffer).map_err(|e| e.to_string())?;
            if count == 0 {
                break;
            }
            hash.write(&buffer[..count]);
        }
    }
    Ok(format!("{:016x}", hash.finish()))
}

fn brief_schema() -> Value {
    let list = json!({"type":"array","maxItems":20,"items":{"type":"string","minLength":1,"maxLength":500}});
    json!({"type":"object","additionalProperties":false,
        "properties":{"objective":{"type":"string","minLength":1,"maxLength":1000},
        "relevantFiles":list,"findings":list,"steps":list,"acceptanceCriteria":list,"risks":list},
        "required":["objective","relevantFiles","findings","steps","acceptanceCriteria","risks"]})
}

fn validate_brief(value: &Value) -> Result<(), String> {
    if value.to_string().len() > 12000 {
        return Err("AGY brief exceeds the 12 KB handoff limit.".into());
    }
    if !value
        .get("objective")
        .and_then(Value::as_str)
        .is_some_and(|s| !s.trim().is_empty() && s.len() <= 1000)
    {
        return Err("AGY returned an invalid objective.".into());
    }
    for field in [
        "relevantFiles",
        "findings",
        "steps",
        "acceptanceCriteria",
        "risks",
    ] {
        let items = value
            .get(field)
            .and_then(Value::as_array)
            .ok_or_else(|| format!("AGY brief is missing {field}"))?;
        if items.len() > 20
            || items.iter().any(|item| {
                !item
                    .as_str()
                    .is_some_and(|s| !s.trim().is_empty() && s.len() <= 500)
            })
        {
            return Err(format!("AGY brief has invalid {field}"));
        }
        if matches!(field, "steps" | "acceptanceCriteria") && items.is_empty() {
            return Err(format!("AGY brief has no {field}"));
        }
    }
    for file in value["relevantFiles"].as_array().unwrap() {
        let path = file.as_str().unwrap();
        if path.contains('\\')
            || path.contains(':')
            || Path::new(path)
                .components()
                .any(|c| !matches!(c, Component::Normal(_) | Component::CurDir))
        {
            return Err(
                "AGY relevantFiles must contain relative repository paths using forward slashes."
                    .into(),
            );
        }
    }
    Ok(())
}

fn extract_brief(output: &str) -> Result<Value, String> {
    let envelope: Value =
        serde_json::from_str(output).map_err(|e| format!("AGY did not return JSON: {e}"))?;
    if envelope.get("is_error").and_then(Value::as_bool) == Some(true) {
        return Err("AGY reported an unsuccessful run. See its output.".into());
    }
    let candidate = envelope
        .get("structured_output")
        .or_else(|| envelope.get("result"))
        .unwrap_or(&envelope);
    let value = match candidate.as_str() {
        Some(text) => serde_json::from_str(text)
            .map_err(|e| format!("AGY result is not a structured brief: {e}"))?,
        None => candidate.clone(),
    };
    validate_brief(&value)?;
    Ok(value)
}

fn codex_events(output: &str) -> Result<Option<Usage>, String> {
    let mut usage = None;
    let mut completed = false;
    for line in output.lines() {
        let Ok(event) = serde_json::from_str::<Value>(line) else {
            continue;
        };
        match event["type"].as_str() {
            Some("turn.failed" | "error") => {
                return Err(format!(
                    "Codex reported a failure: {}",
                    event.get("error").unwrap_or(&event)
                ))
            }
            Some("turn.completed") => {
                completed = true;
                usage = event["usage"].as_object().map(|_| Usage {
                    input_tokens: event["usage"]["input_tokens"].as_u64(),
                    cached_input_tokens: event["usage"]["cached_input_tokens"].as_u64(),
                    output_tokens: event["usage"]["output_tokens"].as_u64(),
                });
            }
            _ => {}
        }
    }
    if completed {
        Ok(usage)
    } else {
        Err("Codex exited without a turn.completed event.".into())
    }
}

struct Worker {
    program: PathBuf,
    prefix: Vec<String>,
    #[cfg(test)]
    fixture: bool,
}

impl Worker {
    fn installed(name: &str) -> Result<Self, String> {
        Ok(Self {
            program: executable(name)?,
            prefix: vec![],
            #[cfg(test)]
            fixture: false,
        })
    }
    async fn run(
        &self,
        state: &WorkflowState,
        run: &WorkflowRun,
        cancel: &AtomicBool,
        args: Vec<String>,
        input: Option<&str>,
        label: &str,
    ) -> Result<ProcessResult, String> {
        let mut all_args = self.prefix.clone();
        #[cfg(test)]
        let args = if self.fixture { vec![] } else { args };
        all_args.extend(args);
        run_process(state, run, cancel, &self.program, &all_args, input, label).await
    }
}

async fn execute(
    state: &WorkflowState,
    run: &WorkflowRun,
    cancel: &AtomicBool,
) -> Result<(), String> {
    let codex = if run.options.mode != "agy-only" {
        Some(Worker::installed("codex")?)
    } else {
        None
    };
    let agy = if run.options.mode != "codex-only" {
        Some(Worker::installed("agy")?)
    } else {
        None
    };
    execute_workers(state, run, cancel, codex, agy).await
}

async fn execute_workers(
    state: &WorkflowState,
    run: &WorkflowRun,
    cancel: &AtomicBool,
    codex: Option<Worker>,
    agy: Option<Worker>,
) -> Result<(), String> {
    let dir = Path::new(&run.artifact_dir);
    if let Some(id) = &run.options.session_id {
        crate::codex_sessions::check_session(&run.options.cwd, id).await?;
        fs::write(dir.join("session-context.md"), &run.options.session_context)
            .map_err(|e| e.to_string())?;
    }
    let before = fingerprint(&run.options.cwd).await?;
    fs::write(dir.join("source-fingerprint.txt"), &before).map_err(|e| e.to_string())?;
    let mut brief = None;
    if let Some(agy) = agy {
        state.update(&run.id, |r| {
            r.stage = "planning".into();
            r.message = "AGY is preparing a bounded implementation brief.".into();
        })?;
        let schema = dir.join("brief.schema.json");
        fs::write(&schema, brief_schema().to_string()).map_err(|e| e.to_string())?;
        let prompt = format!("Read-only investigation. Do not edit project files or implement the task. Do not launch other agents, commit, push, or deploy. Follow repository instructions. Inspect only files needed for the task. Produce the requested structured implementation brief under 12000 bytes. relevantFiles must be relative paths using forward slashes, without line suffixes. Include evidence in findings, bounded steps, acceptance criteria and unresolved risks. Task:\n{}\nPrior session context (verify against current files):\n{}", run.options.prompt, run.options.session_context);
        let mut args = vec![
            "--print".into(),
            prompt,
            "--mode".into(),
            "plan".into(),
            "--sandbox".into(),
            "--disable-slash-commands".into(),
            "--output-format".into(),
            "json".into(),
            "--json-schema".into(),
            schema.to_string_lossy().into_owned(),
        ];
        if !run.options.agy_model.trim().is_empty() {
            args.extend(["--model".into(), run.options.agy_model.trim().into()]);
        }
        let result = agy.run(state, run, cancel, args, None, "agy").await?;
        if result.code != Some(0) {
            return Err(format!(
                "AGY exited with code {:?}. See its output.",
                result.code
            ));
        }
        let value = extract_brief(&result.stdout)?;
        let text = serde_json::to_string_pretty(&value).map_err(|e| e.to_string())?;
        fs::write(dir.join("brief.json"), &text).map_err(|e| e.to_string())?;
        state.update(&run.id, |r| r.brief = Some(text.clone()))?;
        brief = Some(text);
        if before != fingerprint(&run.options.cwd).await? {
            return Err("The repository changed during planning. Handoff stopped to avoid using a stale brief. Review edits and start a new run.".into());
        }
    }
    let Some(codex) = codex else {
        return Ok(());
    };
    state.update(&run.id, |r| {
        r.stage = "implementing".into();
        r.message = "Codex is implementing the scoped task.".into();
    })?;
    let schema = dir.join("implementation.schema.json");
    fs::write(&schema, json!({"type":"object","additionalProperties":false,"properties":{
        "summary":{"type":"string"},"changedFiles":{"type":"array","items":{"type":"string"}},
        "unresolved":{"type":"array","items":{"type":"string"}}},"required":["summary","changedFiles","unresolved"]}).to_string()).map_err(|e| e.to_string())?;
    let result_path = dir.join("implementation.json");
    if run.options.resume_session {
        crate::codex_sessions::check_session(
            &run.options.cwd,
            run.options
                .session_id
                .as_deref()
                .ok_or("Missing session ID")?,
        )
        .await?;
    }
    let context = if run.options.resume_session {
        "Continuing the selected Codex thread; its original history is retained."
    } else {
        &run.options.session_context
    };
    let prompt = format!("Implement this bounded task in the current project. Follow repository instructions. Preserve unrelated user edits. Do not commit, push, deploy, or launch other agents. Inspect the relevant implementation files; avoid a full repository survey when the brief suffices. The coordinator runs the user's configured checks after your turn, so do not repeat those checks unless needed to diagnose a problem. Report unresolved work honestly.\nTask:\n{}\nPrior session context:\n{}\nImplementation brief:\n{}\nCoordinator checks:\n{}",
        run.options.prompt, context, brief.as_deref().unwrap_or("No planning stage requested. Investigate only what this task requires."), run.options.checks.join("\n"));
    let args = codex_args(&run.options, &schema, &result_path);
    let result = codex
        .run(state, run, cancel, args, Some(&prompt), "codex")
        .await?;
    if result.code != Some(0) {
        return Err(format!(
            "Codex exited with code {:?}. See its output.",
            result.code
        ));
    }
    let usage = codex_events(&result.stdout)?;
    let actual_session = result
        .stdout
        .lines()
        .filter_map(|line| serde_json::from_str::<Value>(line).ok())
        .find(|event| event["type"].as_str() == Some("thread.started"))
        .and_then(|event| event["thread_id"].as_str().map(str::to_owned));
    if run.options.resume_session && actual_session != run.options.session_id {
        return Err(
            "Codex did not confirm the requested session. Review the output before continuing."
                .into(),
        );
    }
    state.update(&run.id, |r| r.codex_session_id = actual_session)?;
    let implementation: Value = serde_json::from_slice(
        &fs::read(result_path).map_err(|e| format!("Missing Codex result: {e}"))?,
    )
    .map_err(|e| e.to_string())?;
    let summary = implementation["summary"]
        .as_str()
        .filter(|s| !s.trim().is_empty())
        .ok_or("Codex result has no summary")?
        .to_owned();
    let unresolved = implementation["unresolved"]
        .as_array()
        .ok_or("Codex result has no unresolved list")?;
    if !implementation["changedFiles"]
        .as_array()
        .is_some_and(|items| items.iter().all(Value::is_string))
        || !unresolved.iter().all(Value::is_string)
    {
        return Err("Codex returned an invalid implementation result".into());
    }
    state.update(&run.id, |r| {
        r.usage = usage;
        r.summary = Some(summary);
    })?;
    if !unresolved.is_empty() {
        return Err(format!(
            "Codex reported unresolved work: {}",
            implementation["unresolved"]
        ));
    }
    state.update(&run.id, |r| {
        r.stage = "validating".into();
        r.message = "Running the configured project checks.".into();
    })?;
    for (index, check) in run.options.checks.iter().enumerate() {
        #[cfg(windows)]
        let (shell, args) = {
            let system_root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".into());
            (PathBuf::from(system_root).join("System32/WindowsPowerShell/v1.0/powershell.exe"),
            vec!["-NoProfile".into(), "-NonInteractive".into(), "-Command".into(),
                format!("$ErrorActionPreference = 'Stop'\n& {{\n{check}\n}}\nif ($LASTEXITCODE -ne $null) {{ exit $LASTEXITCODE }}\nif (-not $?) {{ exit 1 }}")])
        };
        #[cfg(not(windows))]
        let (shell, args) = (PathBuf::from("/bin/sh"), vec!["-c".into(), check.clone()]);
        let result = run_process(
            state,
            run,
            cancel,
            &shell,
            &args,
            None,
            &format!("check-{}", index + 1),
        )
        .await?;
        state.update(&run.id, |r| {
            r.checks.push(CheckResult {
                command: check.clone(),
                exit_code: result.code,
                passed: result.code == Some(0),
            })
        })?;
        if result.code != Some(0) {
            return Err(format!(
                "Check failed: {check} (exit {:?}). Changes are kept for review.",
                result.code
            ));
        }
    }
    Ok(())
}

fn codex_args(options: &WorkflowOptions, schema: &Path, result: &Path) -> Vec<String> {
    let mut args = vec![
        "-a".into(),
        "never".into(),
        "--sandbox".into(),
        "workspace-write".into(),
        "exec".into(),
    ];
    if options.resume_session {
        args.push("resume".into());
    }
    args.extend([
        "--json".into(),
        "--output-schema".into(),
        schema.to_string_lossy().into_owned(),
        "--output-last-message".into(),
        result.to_string_lossy().into_owned(),
    ]);
    if !options.codex_model.trim().is_empty() {
        args.extend(["--model".into(), options.codex_model.trim().into()]);
    }
    if !options.codex_effort.is_empty() {
        args.extend([
            "-c".into(),
            format!("model_reasoning_effort=\"{}\"", options.codex_effort),
        ]);
    }
    if options.resume_session {
        if let Some(id) = &options.session_id {
            args.push(id.clone());
        }
    }
    args.push("-".into());
    args
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore = "Requires signed-in native CLIs; lists catalogs without inference"]
    async fn installed_model_catalogs() {
        for provider in ["agy", "codex"] {
            let models = workflow_models(provider.into()).await.unwrap();
            assert!(!models.is_empty(), "{provider} returned an empty catalog");
            println!(
                "{provider}: {} models discovered without inference",
                models.len()
            );
        }
    }

    fn brief() -> Value {
        json!({"objective":"Fix focus handling", "relevantFiles":["src/main.ts"],
            "findings":["Evidence: src/main.ts handler"], "steps":["Update handler"],
            "acceptanceCriteria":["Focus returns to the input"], "risks":[]})
    }

    fn fixture() -> (tempfile::TempDir, WorkflowState, WorkflowRun) {
        let root = tempfile::tempdir().unwrap();
        let project = root.path().join("project");
        fs::create_dir(&project).unwrap();
        let state = WorkflowState::load(root.path().join("runs"));
        let run = WorkflowRun {
            id: "fixture".into(),
            options: WorkflowOptions {
                cwd: project.to_string_lossy().into_owned(),
                prompt: "Fix focus handling with literal $HOME and $(literal)".into(),
                mode: "pipeline".into(),
                checks: vec![],
                timeout_minutes: 1,
                agy_model: "fixture-planner".into(),
                codex_model: "fixture-coder".into(),
                codex_effort: "medium".into(),
                task_type: "discovery".into(),
                routing_reason: "Test handoff".into(),
                session_id: None,
                session_context: String::new(),
                resume_session: false,
            },
            status: "running".into(),
            stage: "preflight".into(),
            started_at: now(),
            finished_at: None,
            message: String::new(),
            brief: None,
            summary: None,
            output: String::new(),
            usage: None,
            codex_session_id: None,
            checks: vec![],
            artifact_dir: root
                .path()
                .join("runs/fixture")
                .to_string_lossy()
                .into_owned(),
        };
        save(&run).unwrap();
        state
            .store
            .lock()
            .unwrap()
            .runs
            .insert(run.id.clone(), run.clone());
        (root, state, run)
    }

    #[test]
    fn validates_structured_handoffs_and_rejects_missing_evidence_contract() {
        assert!(extract_brief(&json!({"structured_output":brief()}).to_string()).is_ok());
        assert!(extract_brief(&json!({"result":brief().to_string()}).to_string()).is_ok());
        assert!(extract_brief(&brief().to_string()).is_ok());
        assert!(extract_brief("finished successfully").is_err());
        let mut missing = brief();
        missing["steps"] = json!([]);
        assert!(validate_brief(&missing).is_err());
        assert!(
            extract_brief(&json!({"is_error":true,"structured_output":brief()}).to_string())
                .is_err()
        );
    }

    #[test]
    fn rejects_unbounded_and_outside_repository_handoffs() {
        let mut value = brief();
        for path in ["../outside", "/etc/passwd", "C:/outside", "src\\file.ts"] {
            value["relevantFiles"] = json!([path]);
            assert!(validate_brief(&value).is_err(), "{path}");
        }
        value = brief();
        value["objective"] = json!("x".repeat(12001));
        assert!(validate_brief(&value).is_err());
    }

    #[test]
    fn requires_completed_codex_turn_and_records_reported_usage() {
        assert!(codex_events("{\"type\":\"thread.started\"}").is_err());
        assert!(codex_events("{\"type\":\"turn.failed\",\"error\":\"quota exceeded\"}").is_err());
        let usage = codex_events("{\"type\":\"turn.completed\",\"usage\":{\"input_tokens\":123,\"cached_input_tokens\":100,\"output_tokens\":23}}").unwrap().unwrap();
        assert_eq!(usage.input_tokens, Some(123));
        assert_eq!(usage.cached_input_tokens, Some(100));
        assert!(codex_events("{\"type\":\"turn.completed\"}")
            .unwrap()
            .is_none());
    }

    #[test]
    fn never_marks_unchecked_or_cancelled_work_as_verified() {
        let (_root, _state, mut run) = fixture();
        run.options.checks = vec!["build".into()];
        finish_run(&mut run, Ok(()), false);
        assert_eq!(run.status, "needs-review");
        run.checks.push(CheckResult {
            command: "build".into(),
            exit_code: Some(0),
            passed: true,
        });
        finish_run(&mut run, Ok(()), false);
        assert_eq!(run.status, "verified");
        finish_run(&mut run, Ok(()), true);
        assert_eq!(run.status, "cancelled");
        finish_run(&mut run, Err("build failed".into()), false);
        assert_eq!(run.status, "failed");
    }

    #[test]
    fn restart_recovers_running_jobs_as_interrupted_without_relaunching() {
        let (_root, state, run) = fixture();
        let restored = WorkflowState::load(state.root.clone());
        let store = restored.store.lock().unwrap();
        assert!(store.active.is_none());
        assert_eq!(store.runs[&run.id].status, "interrupted");
        let disk: WorkflowRun = serde_json::from_slice(
            &fs::read(Path::new(&run.artifact_dir).join("run.json")).unwrap(),
        )
        .unwrap();
        assert_eq!(disk.status, "interrupted");
    }

    #[test]
    fn rejects_invalid_limits_before_launching_workers() {
        let (_root, _state, mut run) = fixture();
        run.options.timeout_minutes = 0;
        assert!(validate_options(&run.options).is_err());
        run.options.timeout_minutes = 1;
        run.options.codex_effort = "invented".into();
        assert!(validate_options(&run.options).is_err());
    }

    #[test]
    fn resume_uses_explicit_session_and_keeps_prompt_on_stdin() {
        let (_root, _state, mut run) = fixture();
        run.options.session_id = Some("session-123".into());
        run.options.resume_session = true;
        let args = codex_args(
            &run.options,
            Path::new("schema.json"),
            Path::new("result.json"),
        );
        assert!(args.windows(2).any(|pair| pair == ["exec", "resume"]));
        assert_eq!(&args[args.len() - 2..], ["session-123", "-"]);
        assert!(!args.contains(&run.options.prompt));
        run.options.session_id = None;
        assert!(validate_options(&run.options).is_err());
    }

    async fn init_repo(run: &WorkflowRun) {
        for args in [
            vec!["init", "-q"],
            vec!["config", "user.email", "fixture@example.invalid"],
            vec!["config", "user.name", "Fixture"],
            vec!["commit", "--allow-empty", "-qm", "fixture"],
        ] {
            git(&run.options.cwd, &args).await.unwrap();
        }
    }

    #[tokio::test]
    async fn fingerprints_untracked_content_and_ignores_build_outputs() {
        let (_root, _state, run) = fixture();
        init_repo(&run).await;
        let file = Path::new(&run.options.cwd).join("untracked.ts");
        fs::write(&file, "before").unwrap();
        let before = fingerprint(&run.options.cwd).await.unwrap();
        fs::write(&file, "after").unwrap();
        assert_ne!(before, fingerprint(&run.options.cwd).await.unwrap());
        fs::write(
            Path::new(&run.options.cwd).join(".gitignore"),
            "build-output\n",
        )
        .unwrap();
        let before = fingerprint(&run.options.cwd).await.unwrap();
        fs::write(Path::new(&run.options.cwd).join("build-output"), "ignored").unwrap();
        assert_eq!(before, fingerprint(&run.options.cwd).await.unwrap());
    }

    #[cfg(windows)]
    mod windows {
        use super::*;

        fn quote(path: &Path) -> String {
            format!("'{}'", path.to_string_lossy().replace('\'', "''"))
        }

        fn shell() -> PathBuf {
            PathBuf::from(std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".into()))
                .join("System32/WindowsPowerShell/v1.0/powershell.exe")
        }

        fn worker(root: &Path, name: &str, script: &str) -> Worker {
            let path = root.join(format!("{name}.ps1"));
            fs::write(&path, script).unwrap();
            Worker {
                program: shell(),
                prefix: vec![
                    "-NoProfile".into(),
                    "-NonInteractive".into(),
                    "-Command".into(),
                    script.into(),
                ],
                fixture: true,
            }
        }

        fn planner(root: &Path, extra: &str) -> Worker {
            worker(root, "planner", &format!("[Console]::WriteLine('{}')\nStart-Sleep -Milliseconds 250\n{extra}\n[IO.File]::WriteAllText({}, 'done')", brief().to_string(), quote(&root.join("agy-exited"))))
        }

        fn coder(root: &Path, requires_brief: bool) -> Worker {
            worker(
                root,
                "coder",
                &format!(
                    r#"
$ErrorActionPreference = 'Stop'
$taskText = [Console]::In.ReadToEnd()
if ({requires_brief} -and (-not (Test-Path {marker}) -or -not $taskText.Contains('Evidence: src/main.ts handler'))) {{ exit 9 }}
if (-not $taskText.Contains('literal $HOME and $(literal)')) {{ exit 10 }}
[IO.File]::WriteAllText({started}, 'started')
$resultPath = {result_path}
[IO.File]::WriteAllText($resultPath, '{{"summary":"Updated focus handling","changedFiles":[],"unresolved":[]}}')
[Console]::WriteLine('{{"type":"turn.completed","usage":{{"input_tokens":123,"cached_input_tokens":100,"output_tokens":23}}}}')
"#,
                    requires_brief = if requires_brief { "$true" } else { "$false" },
                    marker = quote(&root.join("agy-exited")),
                    started = quote(&root.join("codex-started")),
                    result_path = quote(&root.join("runs/fixture/implementation.json"))
                ),
            )
        }

        #[tokio::test]
        async fn pipeline_waits_for_planner_exit_passes_real_brief_and_runs_checks() {
            let (root, state, mut run) = fixture();
            init_repo(&run).await;
            run.options.checks = vec!["Write-Output 'validation passed'".into()];
            let result = execute_workers(
                &state,
                &run,
                &AtomicBool::new(false),
                Some(coder(root.path(), true)),
                Some(planner(root.path(), "")),
            )
            .await;
            assert!(
                result.is_ok(),
                "{result:?}\n{}",
                state.store.lock().unwrap().runs[&run.id].output
            );
            let store = state.store.lock().unwrap();
            let saved = &store.runs[&run.id];
            assert!(saved.brief.as_ref().unwrap().contains("Evidence:"));
            assert_eq!(saved.checks.len(), 1);
            assert!(saved.checks[0].passed);
            assert_eq!(saved.usage.as_ref().unwrap().input_tokens, Some(123));
        }

        #[tokio::test]
        async fn malformed_planner_result_never_launches_codex() {
            let (root, state, run) = fixture();
            init_repo(&run).await;
            let bad = worker(
                root.path(),
                "invalid-planner",
                "[Console]::WriteLine('{\"result\":\"done\"}')",
            );
            let result = execute_workers(
                &state,
                &run,
                &AtomicBool::new(false),
                Some(coder(root.path(), true)),
                Some(bad),
            )
            .await;
            assert!(result.is_err());
            assert!(!root.path().join("codex-started").exists());
        }

        #[tokio::test]
        async fn planner_failure_with_valid_output_still_blocks_handoff() {
            let (root, state, run) = fixture();
            init_repo(&run).await;
            let bad = planner(root.path(), "exit 3");
            let result = execute_workers(
                &state,
                &run,
                &AtomicBool::new(false),
                Some(coder(root.path(), true)),
                Some(bad),
            )
            .await;
            assert!(result.unwrap_err().contains("AGY exited"));
            assert!(!root.path().join("codex-started").exists());
        }

        #[tokio::test]
        async fn timed_out_worker_is_stopped() {
            let (root, state, mut run) = fixture();
            run.options.timeout_minutes = 0; // Internal fixture; public input rejects this.
            let slow = worker(root.path(), "timeout", "Start-Sleep -Seconds 30");
            let result = tokio::time::timeout(
                Duration::from_secs(8),
                slow.run(&state, &run, &AtomicBool::new(false), vec![], None, "slow"),
            )
            .await
            .unwrap();
            assert!(result.unwrap_err().contains("timed out"));
        }

        #[tokio::test]
        async fn changed_repository_blocks_handoff() {
            let (root, state, run) = fixture();
            init_repo(&run).await;
            let changed = planner(
                root.path(),
                "[IO.File]::WriteAllText((Join-Path (Get-Location) 'unexpected.txt'), 'modified')",
            );
            let result = execute_workers(
                &state,
                &run,
                &AtomicBool::new(false),
                Some(coder(root.path(), true)),
                Some(changed),
            )
            .await;
            assert!(result.unwrap_err().contains("stale brief"));
            assert!(!root.path().join("codex-started").exists());
        }

        #[tokio::test]
        async fn direct_coding_skips_planning_and_failed_check_stops_validation() {
            let (root, state, mut run) = fixture();
            init_repo(&run).await;
            run.options.mode = "codex-only".into();
            run.options.checks = vec!["exit 7".into(), "Write-Output 'must not run'".into()];
            let result = execute_workers(
                &state,
                &run,
                &AtomicBool::new(false),
                Some(coder(root.path(), false)),
                None,
            )
            .await;
            assert!(
                result.as_ref().is_err_and(|e| e.contains("Check failed")),
                "{result:?}\n{}",
                state.store.lock().unwrap().runs[&run.id].output
            );
            assert!(!root.path().join("agy-exited").exists());
            let store = state.store.lock().unwrap();
            let checks = &store.runs[&run.id].checks;
            assert_eq!(checks.len(), 1);
            assert_eq!(checks[0].exit_code, Some(7));
            assert!(!checks[0].passed);
        }

        #[tokio::test]
        async fn cancelling_a_worker_stops_it_without_starting_the_next_stage() {
            let (root, state, run) = fixture();
            init_repo(&run).await;
            let slow = worker(root.path(), "slow", "Start-Sleep -Seconds 30");
            let cancel = Arc::new(AtomicBool::new(false));
            let flag = cancel.clone();
            tokio::spawn(async move {
                tokio::time::sleep(Duration::from_millis(500)).await;
                flag.store(true, Ordering::SeqCst);
            });
            let result = tokio::time::timeout(
                Duration::from_secs(8),
                execute_workers(
                    &state,
                    &run,
                    &cancel,
                    Some(coder(root.path(), true)),
                    Some(slow),
                ),
            )
            .await
            .unwrap();
            assert!(result.unwrap_err().contains("Cancelled"));
            assert!(!root.path().join("codex-started").exists());
        }

        #[tokio::test]
        async fn process_tree_guard_kills_descendants_after_parent_exits() {
            let (root, state, run) = fixture();
            // Child tries to create a file after its parent has already exited.
            let marker = root.path().join("orphan-wrote");
            let child_script = root.path().join("descendant.ps1");
            fs::write(
                &child_script,
                format!(
                    "Start-Sleep -Seconds 2\n[IO.File]::WriteAllText({}, 'orphan')",
                    quote(&marker)
                ),
            )
            .unwrap();
            // Establish that the descendant can write the marker without a job.
            assert!(command(&shell())
                .args([
                    "-NoProfile",
                    "-Command",
                    &fs::read_to_string(&child_script).unwrap()
                ])
                .status()
                .await
                .unwrap()
                .success());
            assert!(marker.exists());
            fs::remove_file(&marker).unwrap();
            let parent = worker(root.path(), "parent", &format!("$encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes([IO.File]::ReadAllText({})))\nStart-Process -FilePath {} -WindowStyle Hidden -ArgumentList @('-NoProfile','-EncodedCommand',$encoded)\nStart-Sleep -Milliseconds 150", quote(&child_script), quote(&shell())));
            let result = parent
                .run(
                    &state,
                    &run,
                    &AtomicBool::new(false),
                    vec![],
                    None,
                    "parent",
                )
                .await;
            assert!(result.is_ok(), "{result:?}");
            tokio::time::sleep(Duration::from_millis(2500)).await;
            assert!(
                !marker.exists(),
                "A descendant survived the completed stage"
            );
        }
    }
}
