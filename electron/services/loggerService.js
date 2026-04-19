const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const logDir = path.join(app.getPath('userData'), 'logs');
const logFile = path.join(logDir, 'main.log');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function formatMessage(level, args) {
  const timestamp = new Date().toISOString();
  const message = args
    .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
    .join(' ');
  return `[${timestamp}] [${level}] ${message}\n`;
}

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

function init() {
  console.log = (...args) => {
    originalLog.apply(console, args);
    logStream.write(formatMessage('INFO', args));
  };

  console.error = (...args) => {
    originalError.apply(console, args);
    logStream.write(formatMessage('ERROR', args));
  };

  console.warn = (...args) => {
    originalWarn.apply(console, args);
    logStream.write(formatMessage('WARN', args));
  };

  console.log('--- Logger Initialized ---');
}

module.exports = {
  init,
};
