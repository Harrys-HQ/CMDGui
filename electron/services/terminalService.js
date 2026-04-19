const pty = require('node-pty');
const os = require('os');

const terminals = {};
const dataBuffers = {};
const FLUSH_INTERVAL_MS = 16; // ~60fps
const MAX_BUFFER_SIZE = 65536; // 64KB

let flushTimer = null;

// Use powershell.exe on Windows, bash on others
const shellCommand = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

function flushBuffers(mainWindow) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  Object.keys(dataBuffers).forEach((pid) => {
    const buffer = dataBuffers[pid];
    if (buffer && buffer.length > 0) {
      mainWindow.webContents.send(`terminal-incoming-${pid}`, buffer);
      dataBuffers[pid] = '';
    }
  });
}

function startFlushTimer(mainWindow) {
  if (flushTimer) return;
  flushTimer = setInterval(() => flushBuffers(mainWindow), FLUSH_INTERVAL_MS);
}

function createTerminal(mainWindow, options = {}) {
  const { cols, rows, cwd, shell, envVars } = options;
  const targetCwd = cwd || os.homedir();
  const targetShell = shell || shellCommand;
  const targetEnv = { ...process.env, ...envVars };

  try {
    const ptyProcess = pty.spawn(targetShell, [], {
      name: 'xterm-color',
      cols: cols || 80,
      rows: rows || 30,
      cwd: targetCwd,
      env: targetEnv,
    });

    const pid = ptyProcess.pid;
    terminals[pid] = ptyProcess;
    dataBuffers[pid] = '';

    startFlushTimer(mainWindow);

    ptyProcess.onData((data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        dataBuffers[pid] += data;

        // If buffer gets too large, flush immediately
        if (dataBuffers[pid].length >= MAX_BUFFER_SIZE) {
          mainWindow.webContents.send(`terminal-incoming-${pid}`, dataBuffers[pid]);
          dataBuffers[pid] = '';
        }
      }
    });

    ptyProcess.onExit(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        // Flush remaining data before exit
        if (dataBuffers[pid] && dataBuffers[pid].length > 0) {
          mainWindow.webContents.send(`terminal-incoming-${pid}`, dataBuffers[pid]);
        }
        mainWindow.webContents.send(`terminal-exit-${pid}`);
      }
      delete terminals[pid];
      delete dataBuffers[pid];

      if (Object.keys(terminals).length === 0 && flushTimer) {
        clearInterval(flushTimer);
        flushTimer = null;
      }
    });

    return pid;
  } catch (err) {
    console.error('Failed to spawn terminal:', err);
    throw new Error(`Failed to create terminal: ${err.message}`);
  }
}

function writeTerminal(pid, data) {
  if (terminals[pid]) {
    terminals[pid].write(data);
  }
}

function resizeTerminal(pid, cols, rows) {
  if (terminals[pid]) {
    try {
      terminals[pid].resize(cols, rows);
    } catch (err) {
      console.error('Error resizing terminal:', err);
    }
  }
}

function killTerminal(pid) {
  if (terminals[pid]) {
    terminals[pid].kill();
    delete terminals[pid];
  }
}

function killAll() {
  Object.keys(terminals).forEach((pid) => {
    try {
      terminals[pid].kill();
    } catch (e) {
      console.error(`Failed to kill terminal process ${pid}:`, e);
    }
  });
}

module.exports = {
  createTerminal,
  writeTerminal,
  resizeTerminal,
  killTerminal,
  killAll,
};
