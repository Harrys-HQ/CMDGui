const pty = require('node-pty');
const os = require('os');

const terminals = {};
// Use powershell.exe on Windows, bash on others
const shellCommand = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

function createTerminal(mainWindow, options = {}) {
  const { cols, rows, cwd } = options;
  const targetCwd = cwd || os.homedir();

  try {
    const ptyProcess = pty.spawn(shellCommand, [], {
      name: 'xterm-color',
      cols: cols || 80,
      rows: rows || 30,
      cwd: targetCwd,
      env: process.env,
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
