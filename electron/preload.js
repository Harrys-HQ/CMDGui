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
  },
  
  writeTerminal: (pid, data) => ipcRenderer.send('terminal-write', { pid, data }),
  
  resizeTerminal: (pid, cols, rows) => ipcRenderer.send('terminal-resize', { pid, cols, rows }),
  
  killTerminal: (pid) => ipcRenderer.send('terminal-kill', pid),
  selectFolder: () => ipcRenderer.invoke('dialog-select-folder'),
  getProjectInfo: (path) => ipcRenderer.invoke('project-get-info', path),
  checkAdmin: () => ipcRenderer.invoke('app-check-admin'),
  relaunchAdmin: () => ipcRenderer.send('app-relaunch-admin')
});
