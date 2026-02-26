const { app, BrowserWindow, ipcMain, dialog, shell, session, Menu, globalShortcut, screen } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const os = require('os');
const projectService = require('./services/projectService');
const terminalService = require('./services/terminalService');
const settingsService = require('./services/settingsService');

let mainWindow;

function createWindow() {
  const windowState = settingsService.getWindowState();

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    backgroundColor: '#1e1e1e',
    icon: path.join(__dirname, '../build/icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1e1e1e',
      symbolColor: '#d4d4d4',
      height: 32,
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  // Save window state on change
  const saveState = () => settingsService.saveWindowState(mainWindow);
  mainWindow.on('resize', saveState);
  mainWindow.on('move', saveState);
  mainWindow.on('close', saveState);

  // Check if running in dev mode via npm script
  const isDev = process.env.npm_lifecycle_event === 'dev:electron';

  if (isDev) {
    console.log('Running in dev mode, loading localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    console.log('Running in prod mode, loading dist/index.html');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    mainWindow.webContents.closeDevTools();
  }

  // Security: Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Only allow http and https protocols to be opened externally
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Security: Deny all permission requests (camera, mic, notifications, etc.)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['clipboard-read', 'clipboard-sanitized-write'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  // Initial check for updates in production
  if (process.env.NODE_ENV !== 'development' && !process.env.npm_lifecycle_event) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// --- Auto Updater Events ---

autoUpdater.autoDownload = false;

autoUpdater.on('checking-for-update', () => {
  if (mainWindow) mainWindow.webContents.send('update-status', { status: 'checking' });
});

autoUpdater.on('update-available', (info) => {
  if (mainWindow) mainWindow.webContents.send('update-status', { status: 'available', info });
});

autoUpdater.on('update-not-available', (info) => {
  if (mainWindow) mainWindow.webContents.send('update-status', { status: 'not-available', info });
});

autoUpdater.on('error', (err) => {
  if (mainWindow)
    mainWindow.webContents.send('update-status', { status: 'error', error: err.message });
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow)
    mainWindow.webContents.send('update-status', { status: 'downloading', progress: progressObj });
});

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow) mainWindow.webContents.send('update-status', { status: 'downloaded', info });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  terminalService.killAll();
});

// --- Quake Mode Management ---

let isQuakeEnabled = false;

function toggleQuakeMode() {
  if (!mainWindow) return;

  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    const windowWidth = Math.floor(screenWidth * 0.8);
    const windowHeight = 600;

    mainWindow.setBounds({
      x: Math.floor((screenWidth - windowWidth) / 2),
      y: 0,
      width: windowWidth,
      height: windowHeight,
    });

    mainWindow.show();
    mainWindow.focus();
  }
}

ipcMain.on('app-set-quake-mode', (event, enabled) => {
  isQuakeEnabled = enabled;
  if (enabled) {
    globalShortcut.register('Alt+Space', toggleQuakeMode);
  } else {
    globalShortcut.unregister('Alt+Space');
  }
});

// --- IPC Handlers for System Dialogs & App Mgmt ---

ipcMain.handle('shell-open-external', (event, url) => {
  if (url.startsWith('http:') || url.startsWith('https:')) {
    shell.openExternal(url);
  }
});

ipcMain.handle('shell-open-path', async (event, filePath) => {
  try {
    const absolutePath = path.resolve(filePath);
    await shell.openPath(absolutePath);
    return true;
  } catch (error) {
    console.error('Failed to open path:', error);
    return false;
  }
});

// --- IPC Handlers for Context Menus ---

ipcMain.handle('context-menu-show', (event, type, data) => {
  const template = [];

  if (type === 'terminal') {
    template.push(
      {
        label: 'Copy',
        accelerator: 'CmdOrCtrl+Shift+C',
        click: () => event.sender.send('terminal-context-action', 'copy'),
      },
      {
        label: 'Paste',
        accelerator: 'CmdOrCtrl+Shift+V',
        click: () => event.sender.send('terminal-context-action', 'paste'),
      },
      { type: 'separator' },
      {
        label: 'Clear Terminal',
        click: () => event.sender.send('terminal-context-action', 'clear'),
      }
    );
  } else if (type === 'project') {
    template.push(
      { label: 'Open Folder', click: () => shell.openPath(data.path) },
      {
        label: 'Open in VS Code',
        click: () => {
          require('child_process').spawn('code', [data.path], {
            shell: true, // Use shell to find 'code' command on Windows
          });
        },
      },
      { type: 'separator' },
      {
        label: 'Remove Project',
        click: () =>
          event.sender.send('sidebar-context-action', {
            action: 'remove-project',
            path: data.path,
          }),
      }
    );
  } else if (type === 'tab') {
    template.push(
      {
        label: 'Rename',
        click: () =>
          event.sender.send('sidebar-context-action', { action: 'rename-tab', id: data.id }),
      },
      {
        label: 'Close',
        click: () =>
          event.sender.send('sidebar-context-action', { action: 'close-tab', id: data.id }),
      }
    );
  }

  if (template.length > 0) {
    const menu = Menu.buildFromTemplate(template);
    menu.popup(BrowserWindow.fromWebContents(event.sender));
  }
});

// --- IPC Handlers for Terminal ---

ipcMain.handle('dialog-select-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('project-get-info', async (event, projectPath) => {
  return projectService.getProjectInfo(projectPath);
});

ipcMain.handle('project-get-details', async (event, projectPath) => {
  return projectService.getProjectDetails(projectPath);
});

ipcMain.handle('fs-list-directory', async (event, dirPath) => {
  try {
    const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
    return files.map((f) => ({
      name: f.name,
      isDirectory: f.isDirectory(),
      path: path.join(dirPath, f.name),
    }));
  } catch (error) {
    console.error('Failed to list directory:', error);
    return [];
  }
});

ipcMain.handle('app-check-admin', () => {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve(false); // Only implementing for Windows for now
      return;
    }
    // 'net session' only works if admin
    require('child_process').exec('net session', (err) => {
      resolve(!err);
    });
  });
});

ipcMain.on('app-relaunch-admin', () => {
  if (process.platform === 'win32') {
    const appPath = app.getPath('exe');
    // Relaunch the executable with 'RunAs' to prompt UAC
    require('child_process').spawn(
      'powershell.exe',
      ['Start-Process', `"${appPath}"`, '-Verb', 'RunAs'],
      {
        detached: true,
        stdio: 'ignore',
      }
    );
    app.quit();
  }
});

// --- IPC Handlers for Terminal ---

ipcMain.handle('terminal-create', (event, options) => {
  return terminalService.createTerminal(mainWindow, options);
});

// --- IPC Handlers for Updates ---

ipcMain.handle('app-check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result ? result.updateInfo : null };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('app-download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('app-quit-and-install', () => {
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle('app-get-version', () => {
  return app.getVersion();
});

ipcMain.handle('settings-get', (event, key) => {
  const settings = settingsService.loadSettings();
  return key ? settings[key] : settings;
});

ipcMain.handle('settings-set', (event, key, value) => {
  const settings = settingsService.loadSettings();
  settings[key] = value;
  settingsService.saveSettings(settings);
});

ipcMain.on('terminal-write', (event, { pid, data }) => {
  terminalService.writeTerminal(pid, data);
});

ipcMain.on('terminal-resize', (event, { pid, cols, rows }) => {
  terminalService.resizeTerminal(pid, cols, rows);
});

ipcMain.on('terminal-kill', (event, pid) => {
  terminalService.killTerminal(pid);
});
