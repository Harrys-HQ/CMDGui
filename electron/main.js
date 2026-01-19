const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const pty = require('node-pty');

// Use powershell.exe on Windows, bash on others
const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

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
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers for System Dialogs & App Mgmt ---

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
    if (files.includes('package.json')) return 'react';
    if (files.includes('requirements.txt') || files.includes('main.py')) return 'python';
    if (files.includes('Cargo.toml')) return 'rust';
    if (files.includes('go.mod')) return 'go';
    if (files.includes('.git')) return 'git';
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

  const ptyProcess = pty.spawn(shell, [], {
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