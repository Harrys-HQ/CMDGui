const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  createTerminal: (options) => ipcRenderer.invoke('terminal-create', options),

  onTerminalData: (pid, callback) => {
    const channel = `terminal-incoming-${pid}`;
    const subscription = (event, data) => callback(data);
    ipcRenderer.on(channel, subscription);
    // Return a cleanup function
    return () => ipcRenderer.removeListener(channel, subscription);
  },

  onTerminalExit: (pid, callback) => {
    const channel = `terminal-exit-${pid}`;
    const subscription = () => callback();
    ipcRenderer.once(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },

  writeTerminal: (pid, data) => ipcRenderer.send('terminal-write', { pid, data }),

  resizeTerminal: (pid, cols, rows) => ipcRenderer.send('terminal-resize', { pid, cols, rows }),

  killTerminal: (pid) => ipcRenderer.send('terminal-kill', pid),
  selectFolder: () => ipcRenderer.invoke('dialog-select-folder'),
  getProjectInfo: (path) => ipcRenderer.invoke('project-get-info', path),
  getProjectDetails: (path) => ipcRenderer.invoke('project-get-details', path),
  listDirectory: (path) => ipcRenderer.invoke('fs-list-directory', path),
  checkAdmin: () => ipcRenderer.invoke('app-check-admin'),
  relaunchAdmin: () => ipcRenderer.send('app-relaunch-admin'),
  openExternal: (url) => ipcRenderer.invoke('shell-open-external', url),
  openLocalPath: (filePath) => ipcRenderer.invoke('shell-open-path', filePath),
  checkForUpdates: () => ipcRenderer.invoke('app-check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('app-download-update'),
  quitAndInstall: () => ipcRenderer.invoke('app-quit-and-install'),
  onUpdateStatus: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('update-status', subscription);
    return () => ipcRenderer.removeListener('update-status', subscription);
  },
  getVersion: () => ipcRenderer.invoke('app-get-version'),
  setQuakeMode: (enabled) => ipcRenderer.send('app-set-quake-mode', enabled),
  setStayAwake: (enabled) => ipcRenderer.send('app-set-stay-awake', enabled),

  // Settings Persistence
  settingsGet: (key) => ipcRenderer.invoke('settings-get', key),
  settingsSet: (key, value) => ipcRenderer.invoke('settings-set', key, value),

  // Context Menus
  showContextMenu: (type, data) => ipcRenderer.invoke('context-menu-show', type, data),
  onTerminalContextAction: (callback) => {
    const subscription = (event, action) => callback(action);
    ipcRenderer.on('terminal-context-action', subscription);
    return () => ipcRenderer.removeListener('terminal-context-action', subscription);
  },
  onSidebarContextAction: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('sidebar-context-action', subscription);
    return () => ipcRenderer.removeListener('sidebar-context-action', subscription);
  },
});
