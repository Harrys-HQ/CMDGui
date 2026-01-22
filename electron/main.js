const { app, BrowserWindow, ipcMain, dialog, shell, session, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const os = require('os');
const fs = require('fs');
const pty = require('node-pty');

// Use powershell.exe on Windows, bash on others
const shellCommand = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

let mainWindow;
const terminals = {};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#1e1e1e',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

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
  
  if (!process.env.npm_lifecycle_event) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// --- Auto Updater Events ---

autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info);
});

autoUpdater.on('error', (err) => {
  console.log('Error in auto-updater. ' + err);
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  console.log(log_message);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded');
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'A new version of CmdGUI has been downloaded. Quit and install now?',
    buttons: ['Yes', 'Later']
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers for System Dialogs & App Mgmt ---

ipcMain.handle('shell-open-external', (event, url) => {
  if (url.startsWith('http:') || url.startsWith('https:')) {
    shell.openExternal(url);
  }
});

// --- IPC Handlers for Context Menus ---

ipcMain.handle('context-menu-show', (event, type, data) => {
  const template = [];
  
  if (type === 'terminal') {
    template.push(
      { label: 'Copy', accelerator: 'CmdOrCtrl+Shift+C', click: () => event.sender.send('terminal-context-action', 'copy') },
      { label: 'Paste', accelerator: 'CmdOrCtrl+Shift+V', click: () => event.sender.send('terminal-context-action', 'paste') },
      { type: 'separator' },
      { label: 'Clear Terminal', click: () => event.sender.send('terminal-context-action', 'clear') }
    );
  } else if (type === 'project') {
    template.push(
      { label: 'Open Folder', click: () => shell.openPath(data.path) },
      { label: 'Open in VS Code', click: () => {
        require('child_process').exec(`code "${data.path}"`);
      }},
      { type: 'separator' },
      { label: 'Remove Project', click: () => event.sender.send('sidebar-context-action', { action: 'remove-project', path: data.path }) }
    );
  } else if (type === 'tab') {
    template.push(
      { label: 'Rename', click: () => event.sender.send('sidebar-context-action', { action: 'rename-tab', id: data.id }) },
      { label: 'Close', click: () => event.sender.send('sidebar-context-action', { action: 'close-tab', id: data.id }) }
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
    properties: ['openDirectory']
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('project-get-info', async (event, projectPath) => {
  try {
    const files = await fs.promises.readdir(projectPath);
    const filesLower = files.map(f => f.toLowerCase());

    if (filesLower.includes('package.json')) {
      try {
        const pkgContent = await fs.promises.readFile(path.join(projectPath, 'package.json'), 'utf8');
        const pkg = JSON.parse(pkgContent);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps['react']) return 'react';
        if (deps['vue']) return 'vue';
        if (deps['@angular/core']) return 'angular';
        if (deps['svelte']) return 'svelte';
        if (deps['next']) return 'react';
        if (deps['nuxt']) return 'vue';
        if (deps['@vitejs/plugin-react'] || filesLower.includes('vite.config.ts') || filesLower.includes('vite.config.js')) return 'react';
        return 'node';
      } catch (e) {
        return 'node';
      }
    }
    
    if (filesLower.includes('deno.json') || filesLower.includes('deno.jsonc')) return 'deno';
    if (filesLower.includes('requirements.txt') || filesLower.some(f => f.endsWith('.py')) || filesLower.includes('pyproject.toml')) return 'python';
    if (filesLower.includes('cargo.toml')) return 'rust';
    if (filesLower.includes('go.mod')) return 'go';
    if (filesLower.includes('composer.json')) {
      try {
        const compContent = await fs.promises.readFile(path.join(projectPath, 'composer.json'), 'utf8');
        if (compContent.includes('laravel/framework')) return 'laravel';
        return 'php';
      } catch (e) {
        return 'php';
      }
    }
    if (filesLower.includes('gemfile') || filesLower.some(f => f.endsWith('.rb'))) return 'ruby';
    if (filesLower.includes('pom.xml') || filesLower.includes('build.gradle') || filesLower.some(f => f.endsWith('.java'))) return 'java';
    if (filesLower.includes('dockerfile') || filesLower.includes('docker-compose.yml')) return 'docker';
    if (files.some(f => f.endsWith('.sln') || f.endsWith('.csproj'))) return 'dotnet';
    if (files.some(f => f.endsWith('.cpp') || f.endsWith('.hpp') || f.endsWith('.cc'))) return 'cpp';
    if (filesLower.includes('.git')) return 'git';
    
    return 'folder';
  } catch (err) {
    return 'folder';
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
    require('child_process').spawn('powershell.exe', ['Start-Process', `"${appPath}"`, '-Verb', 'RunAs'], {
      detached: true,
      stdio: 'ignore'
    });
    app.quit();
  }
});

// --- IPC Handlers for Terminal ---

ipcMain.handle('terminal-create', (event, options) => {
  const { cols, rows, cwd } = options || {};
  
  // Default to user home if no cwd provided
  const targetCwd = cwd || os.homedir();

  const ptyProcess = pty.spawn(shellCommand, [], {
    name: 'xterm-color',
    cols: cols || 80,
    rows: rows || 30,
    cwd: targetCwd,
    env: process.env
  });

  const pid = ptyProcess.pid;
  terminals[pid] = ptyProcess;

  ptyProcess.onData((data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(`terminal-incoming-${pid}`, data);
    }
  });

  ptyProcess.onExit(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(`terminal-exit-${pid}`);
      }
      delete terminals[pid];
  });

  return pid;
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

ipcMain.handle('app-get-version', () => {
  return app.getVersion();
});

ipcMain.on('terminal-write', (event, { pid, data }) => {
  if (terminals[pid]) {
    terminals[pid].write(data);
  }
});

ipcMain.on('terminal-resize', (event, { pid, cols, rows }) => {
  if (terminals[pid]) {
    try {
        terminals[pid].resize(cols, rows);
    } catch (err) {
        console.error('Error resizing terminal:', err);
    }
  }
});

ipcMain.on('terminal-kill', (event, pid) => {
    if (terminals[pid]) {
        terminals[pid].kill();
        delete terminals[pid];
    }
});