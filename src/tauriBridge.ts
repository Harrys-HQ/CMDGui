import { openContextMenu, type MenuItem } from './utils/contextMenu';
import type {
  ProjectDetails,
  ProjectUpdate,
  ActivePort,
  FileEntry,
  SidebarAction,
  UpdateStatus,
  UpdateInfo,
  ContextMenuData,
  ElectronAPI,
} from './types';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getVersion as getTauriAppVersion } from '@tauri-apps/api/app';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import type { CodexSession, SessionContext, WorkflowCheckpoint, WorkflowOptions, WorkflowOverview, WorkflowRun } from './workflows';

let activeUpdate: Update | null = null;
const updateStatusCallbacks = new Set<(data: UpdateStatus) => void>();

// Capture right-click mouse coordinates globally
let lastMouseX = 0;
let lastMouseY = 0;
window.addEventListener(
  'contextmenu',
  (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  },
  { capture: true }
);

// Map to hold listeners for terminal/sidebar callbacks
const terminalCallbacks = new Set<(action: string) => void>();
const sidebarCallbacks = new Set<(data: SidebarAction) => void>();
const fileDropCallbacks = new Set<(paths: string[], position?: { x: number; y: number }) => void>();
let isFileDropInitialized = false;

function dispatchFileDrop(paths: string[], position?: { x: number; y: number }) {
  if (!paths || paths.length === 0) return;
  // Bring window to focus so user can immediately interact with dropped content
  try {
    getCurrentWindow()
      .setFocus()
      .catch(() => {});
  } catch {
    /* ignore */
  }

  fileDropCallbacks.forEach((cb) => {
    try {
      cb(paths, position);
    } catch (err) {
      console.error('File drop callback error:', err);
    }
  });
}

let fileDropCleanup: (() => void) | undefined;
let fileDropGeneration = 0;
const preventDropNavigation = (event: DragEvent) => {
  event.preventDefault();
};

function stopFileDropListeners() {
  fileDropGeneration++;
  fileDropCleanup?.();
  fileDropCleanup = undefined;
  isFileDropInitialized = false;
  window.removeEventListener('dragover', preventDropNavigation);
  window.removeEventListener('drop', preventDropNavigation);
}

function initFileDropListeners() {
  if (isFileDropInitialized) return;
  isFileDropInitialized = true;
  const generation = ++fileDropGeneration;
  window.addEventListener('dragover', preventDropNavigation);
  window.addEventListener('drop', preventDropNavigation);
  // A single native Webview listener receives physical coordinates in Tauri v2.
  try {
    getCurrentWebview()
      .onDragDropEvent((event) => {
        if (generation !== fileDropGeneration) return;
        if (event.payload.type !== 'drop') return;
        const { paths, position } = event.payload;
        const dpr = window.devicePixelRatio || 1;
        dispatchFileDrop(paths, { x: position.x / dpr, y: position.y / dpr });
      })
      .then((unlisten) => {
        if (generation !== fileDropGeneration) unlisten();
        else fileDropCleanup = unlisten;
      })
      .catch((error) => {
        if (generation === fileDropGeneration) stopFileDropListeners();
        console.warn('File drop listener failed:', error);
      });
  } catch (error) {
    stopFileDropListeners();
    console.warn('File drop listener failed:', error);
  }
}

function createContextMenu(items: MenuItem[]) {
  openContextMenu(items, { x: lastMouseX, y: lastMouseY });
}

function updateInfo(update: Update): UpdateInfo {
  return {
    version: update.version,
    files: [],
    path: '',
    sha512: '',
    releaseDate: update.date || '',
    releaseNotes: update.body,
  };
}
function updateProgress(percent: number) {
  return { percent, total: 0, delta: 0, transferred: 0, bytesPerSecond: 0 };
}

const bridge = {
  codexSessionsList: (cwd: string, cursor?: string | null) =>
    invoke<{ sessions: CodexSession[]; nextCursor: string | null }>('codex_sessions_list', {
      cwd,
      cursor: cursor ?? null,
    }),
  codexSessionContext: (cwd: string, id: string) =>
    invoke<SessionContext>('codex_session_context', { cwd, id }),
  writeClipboard: (text: string) => invoke<void>('write_clipboard', { text }),
  workflowStart: (options: WorkflowOptions) => invoke<WorkflowRun>('workflow_start', { options }),
  workflowList: (cwd: string | undefined, selectedId: string | null, includeHistory: boolean) =>
    invoke<WorkflowOverview>('workflow_list', { cwd, selectedId, includeHistory }),
  workflowCheckpoint: (id: string) => invoke<WorkflowCheckpoint>('workflow_checkpoint', { id }),
  workflowCancel: (id: string) => invoke<void>('workflow_cancel', { id }),
  workflowOpenArtifacts: (id: string) => invoke<void>('workflow_open_artifacts', { id }),
  workflowModels: (provider: 'agy' | 'codex') =>
    invoke<{ id: string; label: string; efforts: string[] }[]>('workflow_models', { provider }),
  createTerminal: async (options?: {
    cols?: number;
    rows?: number;
    cwd?: string;
    shell?: string;
    envVars?: Record<string, string>;
  }) => {
    const opts = {
      cols: options?.cols,
      rows: options?.rows,
      cwd: options?.cwd,
      shell: options?.shell,
      envVars: options?.envVars,
    };
    return await invoke<string>('create_terminal', { options: opts });
  },

  onTerminalData: (pid: string, callback: (data: string) => void) => {
    let active = true;
    let unlistenFn: (() => void) | null = null;

    listen(`terminal-incoming-${pid}`, (event) => {
      if (active) callback(event.payload as string);
    }).then((unlisten) => {
      unlistenFn = unlisten;
      if (!active) unlisten();
    });

    return () => {
      active = false;
      if (unlistenFn) unlistenFn();
    };
  },

  onTerminalExit: (pid: string, callback: () => void) => {
    let active = true;
    let unlistenFn: (() => void) | null = null;

    listen(`terminal-exit-${pid}`, () => {
      if (active) callback();
    }).then((unlisten) => {
      unlistenFn = unlisten;
      if (!active) unlisten();
    });

    return () => {
      active = false;
      if (unlistenFn) unlistenFn();
    };
  },

  writeTerminal: async (pid: string, data: string) => {
    await invoke('write_terminal', { pid, data });
  },

  resizeTerminal: async (pid: string, cols: number, rows: number) => {
    await invoke('resize_terminal', { pid, cols, rows });
  },

  killTerminal: async (pid: string) => {
    await invoke('kill_terminal', { pid });
  },

  selectFolder: async () => {
    return await invoke<string | null>('dialog_select_folder');
  },

  getProjectInfo: async (path: string) => {
    return await invoke<string>('get_project_info', { projectPath: path });
  },

  getProjectDetails: async (path: string) => {
    return await invoke<ProjectDetails>('get_project_details', { projectPath: path });
  },
  getProjectUpdate: (path: string, previousMetadataVersion?: string) =>
    invoke<ProjectUpdate>('get_project_update', { projectPath: path, previousMetadataVersion }),

  gitStageAll: async (projectPath: string) => {
    return await invoke<string>('git_stage_all', { projectPath });
  },

  gitCommit: async (projectPath: string, message: string) => {
    return await invoke<string>('git_commit', { projectPath, message });
  },

  gitPull: async (projectPath: string) => {
    return await invoke<string>('git_pull', { projectPath });
  },

  gitPush: async (projectPath: string) => {
    return await invoke<string>('git_push', { projectPath });
  },

  getActivePorts: async () => {
    return await invoke<ActivePort[]>('get_active_ports');
  },

  killProcessByPid: async (pid: number) => {
    return await invoke<string>('kill_process_by_pid', { pid });
  },

  listDirectory: async (path: string) => {
    return await invoke<FileEntry[]>('fs_list_directory', { dirPath: path });
  },

  getPlatform: async (): Promise<'windows' | 'linux' | 'macos' | 'other'> => {
    try {
      return await invoke<'windows' | 'linux' | 'macos' | 'other'>('get_platform');
    } catch {
      return 'windows';
    }
  },

  checkAdmin: async () => {
    return await invoke<boolean>('app_check_admin');
  },

  relaunchAdmin: async () => {
    await invoke('app_relaunch_admin');
  },

  openExternal: async (url: string) => {
    try {
      await invoke('shell_open_path', { filePath: url });
    } catch (e) {
      console.error('Failed to open external url:', url, e);
    }
  },

  openLocalPath: async (filePath: string) => {
    try {
      return await invoke<boolean>('shell_open_path', { filePath });
    } catch (e) {
      console.error('Failed to open local path:', filePath, e);
      return false;
    }
  },

  checkForUpdates: async () => {
    updateStatusCallbacks.forEach((cb) => cb({ status: 'checking' }));
    try {
      const update = await check();
      if (update) {
        activeUpdate = update;
        updateStatusCallbacks.forEach((cb) =>
          cb({
            status: 'available',
            info: updateInfo(update),
          })
        );
        return { success: true, updateInfo: updateInfo(update) };
      } else {
        activeUpdate = null;
        updateStatusCallbacks.forEach((cb) => cb({ status: 'not-available' }));
        return { success: true };
      }
    } catch (e) {
      console.error(e);
      updateStatusCallbacks.forEach((cb) => cb({ status: 'error', error: String(e) }));
      return { success: false, error: String(e) };
    }
  },

  downloadUpdate: async () => {
    if (!activeUpdate) {
      updateStatusCallbacks.forEach((cb) =>
        cb({ status: 'error', error: 'No update available to download' })
      );
      return { success: false, error: 'No update available to download' };
    }
    updateStatusCallbacks.forEach((cb) =>
      cb({ status: 'downloading', progress: updateProgress(0) })
    );
    try {
      let totalLength = 0;
      let downloaded = 0;
      await activeUpdate.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            totalLength = event.data.contentLength || 0;
            updateStatusCallbacks.forEach((cb) =>
              cb({ status: 'downloading', progress: updateProgress(0) })
            );
            break;
          case 'Progress': {
            downloaded += event.data.chunkLength;
            const percent = totalLength ? Math.round((downloaded / totalLength) * 100) : 0;
            updateStatusCallbacks.forEach((cb) =>
              cb({ status: 'downloading', progress: updateProgress(percent) })
            );
            break;
          }
          case 'Finished':
            updateStatusCallbacks.forEach((cb) => cb({ status: 'downloaded' }));
            break;
        }
      });
      return { success: true };
    } catch (e) {
      console.error(e);
      updateStatusCallbacks.forEach((cb) => cb({ status: 'error', error: String(e) }));
      return { success: false, error: String(e) };
    }
  },

  quitAndInstall: async () => {
    try {
      await relaunch();
    } catch (e) {
      console.error('Failed to relaunch:', e);
    }
  },

  onUpdateStatus: (callback: (data: UpdateStatus) => void) => {
    updateStatusCallbacks.add(callback);
    return () => {
      updateStatusCallbacks.delete(callback);
    };
  },

  getVersion: async () => {
    try {
      return await getTauriAppVersion();
    } catch {
      return '2.4.6';
    }
  },

  getLaunchArgs: async () => {
    return await invoke<string[]>('get_launch_args');
  },

  onSingleInstance: (callback: (argv: string[], cwd: string) => void) => {
    let unlistenFn: (() => void) | null = null;
    listen<[string[], string]>('single-instance', (event) => {
      // payload in Tauri 2 contains tuple (argv, cwd)
      if (Array.isArray(event.payload)) {
        callback(event.payload[0], event.payload[1]);
      }
    }).then((unlisten) => {
      unlistenFn = unlisten;
    });
    return () => {
      if (unlistenFn) unlistenFn();
    };
  },

  readClipboard: async () => {
    return await invoke<string>('read_clipboard');
  },

  setQuakeMode: (_enabled: boolean) => {
    console.log('Quake mode not implemented directly in Tauri bridge');
  },

  setStayAwake: (enabled: boolean) => {
    invoke('set_stay_awake', { enabled }).catch((err) => {
      console.error('Failed to set stay awake in Tauri:', err);
    });
  },

  updateActiveContext: (_context: unknown) => {
    console.log('Active context update ignored in Tauri bridge');
  },

  settingsGet: async <T>(key?: string): Promise<T | null> => {
    return await invoke<T | null>('settings_get', { key });
  },
  settingsGetMany: (keys: string[]) =>
    invoke<Record<string, unknown>>('settings_get_many', { keys }),

  settingsSet: async (key: string, value: unknown) => {
    await invoke('settings_set', { key, value });
  },
  settingsSetMany: (changes: Record<string, unknown>) =>
    invoke<void>('settings_set_many', { changes }),

  fileCreate: async (path: string) => {
    try {
      await invoke('file_create', { filePath: path });
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  fileMkdir: async (path: string) => {
    try {
      await invoke('file_mkdir', { dirPath: path });
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  fileRename: async (oldPath: string, newPath: string) => {
    try {
      await invoke('file_rename', { oldPath, newPath });
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  fileDelete: async (path: string) => {
    try {
      await invoke('file_delete', { itemPath: path });
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  fileShowInFolder: async (path: string) => {
    try {
      await invoke('file_show_in_folder', { itemPath: path });
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  showContextMenu: async (type: string, data?: ContextMenuData) => {
    if (type === 'terminal') {
      createContextMenu([
        { label: '📋 Copy', callback: () => terminalCallbacks.forEach((cb) => cb('copy')) },
        { label: '📥 Paste', callback: () => terminalCallbacks.forEach((cb) => cb('paste')) },
        { isSeparator: true },
        {
          label: '━ Split Horizontal',
          callback: () => terminalCallbacks.forEach((cb) => cb('split-horizontal')),
        },
        {
          label: '┃ Split Vertical',
          callback: () => terminalCallbacks.forEach((cb) => cb('split-vertical')),
        },
        { isSeparator: true },
        {
          label: '🧹 Clear Terminal',
          callback: () => terminalCallbacks.forEach((cb) => cb('clear')),
        },
      ]);
    } else if (type === 'project' && data && 'path' in data) {
      createContextMenu([
        {
          label: '📂 Open Folder',
          callback: () => invoke('shell_open_path', { filePath: data.path }),
        },
        {
          label: '💻 Open in VS Code',
          callback: () => invoke('open_in_vscode', { path: data.path }),
        },
        { isSeparator: true },
        {
          label: '❌ Remove Project',
          callback: () =>
            sidebarCallbacks.forEach((cb) => cb({ action: 'remove-project', path: data.path })),
        },
      ]);
    } else if (type === 'tab' && data && 'id' in data) {
      createContextMenu([
        {
          label: '✏️ Rename',
          callback: () =>
            sidebarCallbacks.forEach((cb) => cb({ action: 'rename-tab', id: data.id })),
        },
        {
          label: '❌ Close',
          callback: () =>
            sidebarCallbacks.forEach((cb) => cb({ action: 'close-tab', id: data.id })),
        },
      ]);
    } else if (type === 'file-explorer' && data && 'path' in data) {
      const menuItems: { label?: string; callback?: () => void; isSeparator?: boolean }[] = [];
      if (data.isDirectory) {
        menuItems.push(
          {
            label: '💻 Open in Terminal',
            callback: () =>
              sidebarCallbacks.forEach((cb) =>
                cb({ action: 'explorer-open-terminal', path: data.path })
              ),
          },
          { isSeparator: true },
          {
            label: '📄 New File',
            callback: () =>
              sidebarCallbacks.forEach((cb) =>
                cb({ action: 'explorer-new-file', path: data.path })
              ),
          },
          {
            label: '📁 New Folder',
            callback: () =>
              sidebarCallbacks.forEach((cb) =>
                cb({ action: 'explorer-new-folder', path: data.path })
              ),
          },
          { isSeparator: true }
        );
      }
      menuItems.push(
        {
          label: '✏️ Rename',
          callback: () =>
            sidebarCallbacks.forEach((cb) => cb({ action: 'explorer-rename', path: data.path })),
        },
        {
          label: '🗑️ Delete',
          callback: () =>
            sidebarCallbacks.forEach((cb) => cb({ action: 'explorer-delete', path: data.path })),
        },
        { isSeparator: true },
        {
          label: '📂 Show in Explorer',
          callback: () => invoke('file_show_in_folder', { itemPath: data.path }),
        }
      );
      createContextMenu(menuItems);
    }
  },

  onTerminalContextAction: (callback: (action: string) => void) => {
    terminalCallbacks.add(callback);
    return () => {
      terminalCallbacks.delete(callback);
    };
  },

  onSidebarContextAction: (callback: (data: SidebarAction) => void) => {
    sidebarCallbacks.add(callback);
    return () => {
      sidebarCallbacks.delete(callback);
    };
  },

  onFileDrop: (callback: (paths: string[], position?: { x: number; y: number }) => void) => {
    fileDropCallbacks.add(callback);
    initFileDropListeners();
    return () => {
      fileDropCallbacks.delete(callback);
      if (!fileDropCallbacks.size) stopFileDropListeners();
    };
  },
};

export const tauriBridge = bridge satisfies ElectronAPI;
