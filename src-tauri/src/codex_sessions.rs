//! Read-only history access. Browsing sessions never starts model inference.
use crate::workflow::{command, executable, ProcessTree};
use serde::Serialize;
use serde_json::{json, Value};
use std::{fs, process::Stdio, time::Duration};
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};

const CONTEXT_LIMIT: usize = 12000;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexSession {
    pub id: String,
    pub title: String,
    pub cwd: String,
    pub updated_at: u64,
    pub status: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionPage {
    sessions: Vec<CodexSession>,
    next_cursor: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionContext {
    session: CodexSession,
    context: String,
    truncated: bool,
}

pub(crate) async fn rpc(cwd: &str, method: &str, params: Value) -> Result<Value, String> {
    let mut child = command(&executable("codex")?)
        .args(["app-server", "--listen", "stdio://"])
        .current_dir(cwd)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| e.to_string())?;
    let tree = ProcessTree::attach(&child)?;
    let mut stdin = child.stdin.take().ok_or("Missing Codex input")?;
    let mut stdout = BufReader::new(child.stdout.take().ok_or("Missing Codex output")?)
        .take(8 * 1024 * 1024)
        .lines();
    let result = tokio::time::timeout(Duration::from_secs(25), async {
        let init = json!({"method":"initialize","id":1,"params":{"clientInfo":{
            "name":"cmdgui","title":"CmdGUI","version":env!("CARGO_PKG_VERSION")}}});
        stdin
            .write_all(format!("{init}\n").as_bytes())
            .await
            .map_err(|e| e.to_string())?;
        while let Some(line) = stdout.next_line().await.map_err(|e| e.to_string())? {
            let Ok(message) = serde_json::from_str::<Value>(&line) else {
                continue;
            };
            match message["id"].as_u64() {
                Some(1) => {
                    if message.get("error").is_some() {
                        return Err("Codex history connection failed. Check the CLI login.".into());
                    }
                    let request = json!({"method":method,"id":2,"params":params});
                    stdin
                        .write_all(
                            format!("{{\"method\":\"initialized\"}}\n{request}\n").as_bytes(),
                        )
                        .await
                        .map_err(|e| e.to_string())?;
                }
                Some(2) => {
                    if let Some(error) = message.get("error") {
                        return Err(format!(
                            "Codex {method}: {}",
                            error["message"].as_str().unwrap_or("request failed")
                        ));
                    }
                    return message
                        .get("result")
                        .cloned()
                        .ok_or_else(|| "Codex returned an empty response".into());
                }
                _ => {}
            }
        }
        Err("Codex closed the history connection or its response exceeded 8 MiB.".into())
    })
    .await
    .map_err(|_| "Codex session lookup timed out".to_string())
    .and_then(|r| r);
    drop(tree);
    let _ = child.kill().await;
    let _ = child.wait().await;
    result
}

fn project_path(cwd: &str) -> Result<String, String> {
    let path = fs::canonicalize(cwd).map_err(|e| format!("Cannot open project: {e}"))?;
    if !path.is_dir() {
        return Err("Select a project directory".into());
    }
    let path = path.to_string_lossy();
    #[cfg(windows)]
    {
        if let Some(path) = path.strip_prefix(r"\\?\UNC\") {
            return Ok(format!(r"\\{path}"));
        }
        return Ok(path.strip_prefix(r"\\?\").unwrap_or(&path).to_owned());
    }
    #[cfg(not(windows))]
    Ok(path.into_owned())
}

fn same_project(left: &str, right: &str) -> bool {
    match (project_path(left), project_path(right)) {
        #[cfg(windows)]
        (Ok(left), Ok(right)) => left.eq_ignore_ascii_case(&right),
        #[cfg(not(windows))]
        (Ok(left), Ok(right)) => left == right,
        _ => false,
    }
}

fn session(value: &Value) -> Result<CodexSession, String> {
    let id = value["id"].as_str().ok_or("Codex session has no ID")?;
    let title = value["name"]
        .as_str()
        .filter(|s| !s.trim().is_empty())
        .or_else(|| value["preview"].as_str())
        .unwrap_or("Untitled Codex session");
    Ok(CodexSession {
        id: id.into(),
        title: clip(title, 240).0,
        cwd: value["cwd"].as_str().unwrap_or("").into(),
        updated_at: value["updatedAt"].as_u64().unwrap_or(0),
        status: value["status"]["type"]
            .as_str()
            .unwrap_or("notLoaded")
            .into(),
    })
}

pub(crate) async fn check_session(cwd: &str, id: &str) -> Result<Value, String> {
    if id.is_empty()
        || id.len() > 128
        || !id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err("Invalid Codex session ID".into());
    }
    let result = rpc(cwd, "thread/read", json!({"threadId":id})).await?;
    let thread = result.get("thread").ok_or("Codex session was not found")?;
    if thread["id"].as_str() != Some(id) {
        return Err("Codex returned a different session".into());
    }
    if !same_project(cwd, thread["cwd"].as_str().unwrap_or("")) {
        return Err(
            "This Codex session belongs to a different project. Select its project folder first."
                .into(),
        );
    }
    if thread["status"]["type"].as_str() == Some("active") {
        return Err(
            "This Codex session is busy. Finish its active turn before continuing it here.".into(),
        );
    }
    Ok(thread.clone())
}

#[tauri::command]
pub async fn codex_sessions_list(
    cwd: String,
    cursor: Option<String>,
) -> Result<SessionPage, String> {
    let project = project_path(&cwd)?;
    let response = rpc(
        &project,
        "thread/list",
        json!({"cwd":project,"cursor":cursor,"limit":25,
        "sortKey":"updated_at","sourceKinds":["cli","vscode","exec","appServer"],"archived":false}),
    )
    .await?;
    let items = response["data"]
        .as_array()
        .ok_or("Invalid Codex session list")?;
    let sessions = items
        .iter()
        .filter(|item| same_project(&cwd, item["cwd"].as_str().unwrap_or("")))
        .map(session)
        .collect::<Result<_, _>>()?;
    Ok(SessionPage {
        sessions,
        next_cursor: response["nextCursor"].as_str().map(str::to_owned),
    })
}

fn clip(text: &str, limit: usize) -> (String, bool) {
    if text.len() <= limit {
        return (text.into(), false);
    }
    let mut end = limit;
    while !text.is_char_boundary(end) {
        end -= 1;
    }
    (text[..end].to_owned(), true)
}

fn context_excerpt(thread: &Value, turns: &[Value], more_history: bool) -> (String, bool) {
    let header = format!("Previous Codex session context (bounded excerpt, not a full transcript).\nThe new task and current files take precedence.\nSession: {}\nOriginal preview: {}\n",
        thread["id"].as_str().unwrap_or(""), clip(thread["preview"].as_str().unwrap_or(""), 2000).0);
    let mut blocks = Vec::new();
    let mut size = header.len();
    let mut truncated = more_history;
    // Newest-first traversal retains recent messages when the budget fills.
    for turn in turns
        .iter()
        .filter(|t| t["status"].as_str() == Some("completed"))
    {
        if let Some(items) = turn["items"].as_array() {
            for item in items.iter().rev() {
                let (role, message) = match item["type"].as_str() {
                    Some("userMessage") => (
                        "User",
                        item["content"]
                            .as_array()
                            .map(|parts| {
                                parts
                                    .iter()
                                    .filter(|p| p["type"].as_str() == Some("text"))
                                    .filter_map(|p| p["text"].as_str())
                                    .collect::<Vec<_>>()
                                    .join("\n")
                            })
                            .unwrap_or_default(),
                    ),
                    Some("agentMessage") => {
                        ("Codex", item["text"].as_str().unwrap_or("").to_owned())
                    }
                    _ => continue, // Never export tools, reasoning or system messages.
                };
                if message.trim().is_empty() {
                    continue;
                }
                let (message, cut) = clip(&message, 2000);
                truncated |= cut;
                let block = format!("\n{role}:\n{message}\n");
                if size + block.len() > CONTEXT_LIMIT {
                    truncated = true;
                    continue;
                }
                size += block.len();
                blocks.push(block);
            }
        }
    }
    (
        header + &blocks.into_iter().rev().collect::<String>(),
        truncated,
    )
}

#[tauri::command]
pub async fn codex_session_context(cwd: String, id: String) -> Result<SessionContext, String> {
    let thread = check_session(&cwd, &id).await?;
    let recent = rpc(
        &cwd,
        "thread/turns/list",
        json!({"threadId":id,"limit":4,
        "sortDirection":"desc","itemsView":"full"}),
    )
    .await?;
    let turns = recent["data"]
        .as_array()
        .ok_or("Codex returned no readable turns")?;
    let (context, truncated) = context_excerpt(&thread, turns, !recent["nextCursor"].is_null());
    Ok(SessionContext {
        session: session(&thread)?,
        context,
        truncated,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn excerpt_exports_only_visible_conversation_and_bounds_unicode() {
        let turns = vec![json!({"status":"completed","items":[
            {"type":"userMessage","content":[{"type":"text","text":"Continue the settings fix"}]},
            {"type":"reasoning","text":"PRIVATE_REASONING"},
            {"type":"commandExecution","aggregatedOutput":"PRIVATE_TOOL_OUTPUT"},
            {"type":"agentMessage","text":"界".repeat(5000)}]})];
        let (context, truncated) =
            context_excerpt(&json!({"id":"fixture","preview":"Settings"}), &turns, false);
        assert!(context.contains("Continue the settings fix"));
        assert!(!context.contains("PRIVATE_"));
        assert!(context.len() <= CONTEXT_LIMIT);
        assert!(truncated);
    }
    #[test]
    fn project_comparison_rejects_other_directories() {
        let root = tempfile::tempdir().unwrap();
        let other = tempfile::tempdir().unwrap();
        assert!(same_project(
            root.path().to_str().unwrap(),
            root.path().join(".").to_str().unwrap()
        ));
        assert!(!same_project(
            root.path().to_str().unwrap(),
            other.path().to_str().unwrap()
        ));
    }
    #[tokio::test]
    #[ignore = "Reads signed-in local session metadata without inference"]
    async fn installed_session_history() {
        let cwd = std::env::current_dir()
            .unwrap()
            .parent()
            .unwrap()
            .to_string_lossy()
            .into_owned();
        let page = codex_sessions_list(cwd.clone(), None).await.unwrap();
        println!("Found {} project sessions", page.sessions.len());
        if let Some(item) = page.sessions.iter().find(|s| s.status != "active") {
            let snapshot = codex_session_context(cwd, item.id.clone()).await.unwrap();
            assert!(!snapshot.context.is_empty());
            assert!(snapshot.context.len() <= CONTEXT_LIMIT);
            println!("Read bounded context successfully (content not printed)");
        }
    }
}
