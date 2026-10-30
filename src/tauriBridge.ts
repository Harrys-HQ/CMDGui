import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getVersion as getTauriAppVersion } from '@tauri-apps/api/app';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

let activeUpdate: Update | null = null;
const updateStatusCallbacks = new Set<(data: any) => void>();

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
const sidebarCallbacks = new Set<(data: any) => void>();
const fileDropCallbacks = new Set<(paths: string[], position?: { x: number; y: number }) => void>();
let isFileDropInitialized = false;
let lastDropTimestamp = 0;
let lastDropSignature = '';

function dispatchFileDrop(paths: string[], position?: { x: number; y: number }) {
  if (!paths || paths.length === 0) return;
  const now = Date.now();
  const signature = paths.join('|');
  // Deduplicate triggers within 300ms for identical paths
  if (now - lastDropTimestamp < 300 && signature === lastDropSignature) {
    return;
  }
  lastDropTimestamp = now;
  lastDropSignature = signature;

  // Bring window to focus so user can immediately interact with dropped content
  try {
    getCurrentWindow().setFocus().catch(() => {});
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

function cleanDroppedPath(p: string): string {
  if (typeof p !== "string") return "";
  let cleaned = p.trim();
  if (cleaned.startsWith("file:///")) {
    cleaned = decodeURI(cleaned.replace(/^file:\/\/\/?/, ""));
    if (/^[a-zA-Z]:\//.test(cleaned)) {
      cleaned = cleaned.replace(/\//g, "\\");
    }
  }
  return cleaned;
}

function extractPathsAndPosition(payload: any): { paths: string[]; position?: { x: number; y: number } } {
  if (!payload) return { paths: [] };
  let pos: { x: number; y: number } | undefined;
  if (payload.position && typeof payload.position.x === "number" && typeof payload.position.y === "number") {
    // Tauri v2 onDragDropEvent delivers PhysicalPosition in physical pixels.
    // Convert to CSS logical coordinates so DOM getBoundingClientRect() comparisons align.
    const dpr = typeof window !== "undefined" && window.devicePixelRatio ? window.devicePixelRatio : 1;
    if (typeof payload.position.toLogical === "function") {
      try {
        const logical = payload.position.toLogical(dpr);
        pos = { x: logical.x, y: logical.y };
      } catch {
        pos = { x: payload.position.x / dpr, y: payload.position.y / dpr };
      }
    } else {
      pos = { x: payload.position.x / dpr, y: payload.position.y / dpr };
    }
  }

  let rawPaths: string[] = [];
  if (Array.isArray(payload) && typeof payload[0] === "string") {
    rawPaths = payload;
  } else if (payload.type === "drop" && Array.isArray(payload.paths)) {
    rawPaths = payload.paths;
  } else if (Array.isArray(payload.paths)) {
    rawPaths = payload.paths;
  }

  const paths = rawPaths.map(cleanDroppedPath).filter(Boolean);
  return { paths, position: pos };
}

function initFileDropListeners() {
  if (isFileDropInitialized) return;
  isFileDropInitialized = true;

  // Global window dragover / drop preventDefault to eliminate WebView2 URL navigation
  if (typeof window !== 'undefined') {
    window.addEventListener(
      'dragover',
      (e) => {
        e.preventDefault();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'copy';
        }
      },
      false
    );
    window.addEventListener(
      'drop',
      (e) => {
        e.preventDefault();
        // If native DOM dataTransfer has files with .path (e.g. Electron or patched webview)
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const domPaths = [];
          for (let i = 0; i < e.dataTransfer.files.length; i++) {
            const file = e.dataTransfer.files[i] as unknown as { path?: string };
            if (file && typeof file.path === 'string' && file.path.length > 0) {
              domPaths.push(file.path);
            }
          }
          if (domPaths.length > 0) {
            dispatchFileDrop(domPaths, { x: e.clientX, y: e.clientY });
          }
        }
      },
      false
    );
  }

  // 1. WebviewWindow onDragDropEvent
  try {
    const webviewWindow = getCurrentWebviewWindow();
    if (webviewWindow && typeof webviewWindow.onDragDropEvent === 'function') {
      webviewWindow
        .onDragDropEvent((event) => {
          const { paths, position } = extractPathsAndPosition(event.payload);
          if (paths.length > 0) dispatchFileDrop(paths, position);
        })
        .catch((err) => console.warn('WebviewWindow drag-drop listener failed:', err));
    }
  } catch (e) {
    console.warn('getCurrentWebviewWindow failed:', e);
  }

  // 2. Window onDragDropEvent
  try {
    const appWindow = getCurrentWindow();
    if (appWindow && typeof appWindow.onDragDropEvent === 'function') {
      appWindow
        .onDragDropEvent((event) => {
          const { paths, position } = extractPathsAndPosition(event.payload);
          if (paths.length > 0) dispatchFileDrop(paths, position);
        })
        .catch((err) => console.warn('Window drag-drop listener failed:', err));
    }
  } catch (e) {
    console.warn('getCurrentWindow failed:', e);
  }

  // 3. Webview onDragDropEvent
  try {
    const webview = getCurrentWebview();
    if (webview && typeof webview.onDragDropEvent === 'function') {
      webview
        .onDragDropEvent((event) => {
          const { paths, position } = extractPathsAndPosition(event.payload);
          if (paths.length > 0) dispatchFileDrop(paths, position);
        })
        .catch((err) => console.warn('Webview drag-drop listener failed:', err));
    }
  } catch (e) {
    console.warn('getCurrentWebview failed:', e);
  }

  // 4. Raw tauri://drag-drop event with target 'main'
  try {
    listen(
      'tauri://drag-drop',
      (event) => {
        const { paths, position } = extractPathsAndPosition(event.payload);
        if (paths.length > 0) dispatchFileDrop(paths, position);
      },
      { target: 'main' }
    ).catch((err) => console.warn('Raw drag-drop (main) failed:', err));
  } catch (e) {
    console.warn('listen tauri://drag-drop (main) failed:', e);
  }

  // 5. Raw tauri://drag-drop event without target filter
  try {
    listen('tauri://drag-drop', (event) => {
      const { paths, position } = extractPathsAndPosition(event.payload);
      if (paths.length > 0) dispatchFileDrop(paths, position);
    }).catch((err) => console.warn('Raw drag-drop (any) failed:', err));
  } catch (e) {
    console.warn('listen tauri://drag-drop (any) failed:', e);
  }
}

// Style template for custom HTML context menu overlay
const menuStyle = `
  position: fixed;
  z-index: 99999;
  background-color: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  padding: 4px 0;
  min-width: 150px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 13px;
  color: #cccccc;
`;

const itemStyle = `
  padding: 6px 12px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
`;

const separatorStyle = `
  height: 1px;
  background-color: #3c3c3c;
  margin: 4px 0;
`;

function createContextMenu(items: { label?: string; action?: string; callback?: () => void; isSeparator?: boolean }[]) {
  // Remove existing menu if any
  const existingMenu = document.getElementById('tauri-custom-context-menu');
  if (existingMenu) existingMenu.remove();

  const menu = document.createElement('div');
  menu.id = 'tauri-custom-context-menu';
  menu.setAttribute('style', menuStyle);
  menu.style.left = `${lastMouseX}px`;
  menu.style.top = `${lastMouseY}px`;

  items.forEach((item) => {
    if (item.isSeparator) {
      const sep = document.createElement('div');
      sep.setAttribute('style', separatorStyle);
      menu.appendChild(sep);
      return;
    }

    const div = document.createElement('div');
    div.setAttribute('style', itemStyle);
    div.innerText = item.label || '';

    // Hover effect
    div.addEventListener('mouseenter', () => {
      div.style.backgroundColor = '#007acc';
      div.style.color = '#ffffff';
    });
    div.addEventListener('mouseleave', () => {
      div.style.backgroundColor = 'transparent';
      div.style.color = '#cccccc';
    });

    div.addEventListener('click', () => {
      if (item.callback) item.callback();
      menu.remove();
    });

    menu.appendChild(div);
  });

  document.body.appendChild(menu);

  // Close menu when clicking outside
  const closeMenu = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node)) {
      menu.remove();
      document.removeEventListener('mousedown', closeMenu);
    }
  };
  document.addEventListener('mousedown', closeMenu);
}

export const tauriBridge = {
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
    return await invoke<any>('get_project_details', { projectPath: path });
  },

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
    return await invoke<any[]>('get_active_ports');
  },

  killProcessByPid: async (pid: number) => {
    return await invoke<string>('kill_process_by_pid', { pid });
  },

  listDirectory: async (path: string) => {
    return await invoke<any[]>('fs_list_directory', { dirPath: path });
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
            info: {
              version: update.version,
              releaseDate: update.date,
              body: update.body,
            },
          })
        );
        return { success: true, updateInfo: { version: update.version } };
      } else {
        activeUpdate = null;
        updateStatusCallbacks.forEach((cb) => cb({ status: 'not-available' }));
        return { success: true, updateInfo: null };
      }
    } catch (e: any) {
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
    updateStatusCallbacks.forEach((cb) => cb({ status: 'downloading', progress: { percent: 0 } }));
    try {
      let totalLength = 0;
      let downloaded = 0;
      await activeUpdate.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            totalLength = event.data.contentLength || 0;
            updateStatusCallbacks.forEach((cb) =>
              cb({ status: 'downloading', progress: { percent: 0 } })
            );
            break;
          case 'Progress': {
            downloaded += event.data.chunkLength;
            const percent = totalLength ? Math.round((downloaded / totalLength) * 100) : 0;
            updateStatusCallbacks.forEach((cb) =>
              cb({ status: 'downloading', progress: { percent } })
            );
            break;
          }
          case 'Finished':
            updateStatusCallbacks.forEach((cb) => cb({ status: 'downloaded' }));
            break;
        }
      });
      return { success: true };
    } catch (e: any) {
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

  onUpdateStatus: (callback: (data: any) => void) => {
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
    listen<any>('single-instance', (event) => {
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
    invoke('set_stay_awake', { enabled }).catch(err => {
      console.error('Failed to set stay awake in Tauri:', err);
    });
  },

  updateActiveContext: (_context: unknown) => {
    console.log('Active context update ignored in Tauri bridge');
  },

  settingsGet: async <T>(key?: string): Promise<T | null> => {
    return await invoke<T | null>('settings_get', { key });
  },

  settingsSet: async (key: string, value: unknown) => {
    await invoke('settings_set', { key, value });
  },

  fileCreate: async (path: string) => {
    try {
      await invoke('file_create', { filePath: path });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: String(e) };
    }
  },

  fileMkdir: async (path: string) => {
    try {
      await invoke('file_mkdir', { dirPath: path });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: String(e) };
    }
  },

  fileRename: async (oldPath: string, newPath: string) => {
    try {
      await invoke('file_rename', { oldPath, newPath });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: String(e) };
    }
  },

  fileDelete: async (path: string) => {
    try {
      await invoke('file_delete', { itemPath: path });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: String(e) };
    }
  },

  fileShowInFolder: async (path: string) => {
    try {
      await invoke('file_show_in_folder', { itemPath: path });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: String(e) };
    }
  },

  showContextMenu: async (type: string, data?: any) => {
    if (type === 'terminal') {
      createContextMenu([
        { label: '📋 Copy', callback: () => terminalCallbacks.forEach((cb) => cb('copy')) },
        { label: '📥 Paste', callback: () => terminalCallbacks.forEach((cb) => cb('paste')) },
        { isSeparator: true },
        { label: '━ Split Horizontal', callback: () => terminalCallbacks.forEach((cb) => cb('split-horizontal')) },
        { label: '┃ Split Vertical', callback: () => terminalCallbacks.forEach((cb) => cb('split-vertical')) },
        { isSeparator: true },
        { label: '🧹 Clear Terminal', callback: () => terminalCallbacks.forEach((cb) => cb('clear')) },
      ]);
    } else if (type === 'project') {
      createContextMenu([
        { label: '📂 Open Folder', callback: () => invoke('shell_open_path', { filePath: data.path }) },
        { label: '💻 Open in VS Code', callback: () => invoke('open_in_vscode', { path: data.path }) },
        { isSeparator: true },
        {
          label: '❌ Remove Project',
          callback: () => sidebarCallbacks.forEach((cb) => cb({ action: 'remove-project', path: data.path })),
        },
      ]);
    } else if (type === 'tab') {
      createContextMenu([
        { label: '✏️ Rename', callback: () => sidebarCallbacks.forEach((cb) => cb({ action: 'rename-tab', id: data.id })) },
        { label: '❌ Close', callback: () => sidebarCallbacks.forEach((cb) => cb({ action: 'close-tab', id: data.id })) },
      ]);
    } else if (type === 'file-explorer') {
      const menuItems: { label?: string; callback?: () => void; isSeparator?: boolean }[] = [];
      if (data.isDirectory) {
        menuItems.push(
          {
            label: '💻 Open in Terminal',
            callback: () => sidebarCallbacks.forEach((cb) => cb({ action: 'explorer-open-terminal', path: data.path })),
          },
          { isSeparator: true },
          {
            label: '📄 New File',
            callback: () => sidebarCallbacks.forEach((cb) => cb({ action: 'explorer-new-file', path: data.path })),
          },
          {
            label: '📁 New Folder',
            callback: () => sidebarCallbacks.forEach((cb) => cb({ action: 'explorer-new-folder', path: data.path })),
          },
          { isSeparator: true }
        );
      }
      menuItems.push(
        {
          label: '✏️ Rename',
          callback: () => sidebarCallbacks.forEach((cb) => cb({ action: 'explorer-rename', path: data.path })),
        },
        {
          label: '🗑️ Delete',
          callback: () => sidebarCallbacks.forEach((cb) => cb({ action: 'explorer-delete', path: data.path })),
        },
        { isSeparator: true },
        { label: '📂 Show in Explorer', callback: () => invoke('file_show_in_folder', { itemPath: data.path }) }
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

  onSidebarContextAction: (callback: (data: any) => void) => {
    sidebarCallbacks.add(callback);
    return () => {
      sidebarCallbacks.delete(callback);
    };
  },

  onFileDrop: (callback: (paths: string[], position?: { x: number; y: number }) => void) => {
    initFileDropListeners();
    fileDropCallbacks.add(callback);
    return () => {
      fileDropCallbacks.delete(callback);
    };
  },
};
