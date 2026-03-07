const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
  return {};
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

function getWindowState() {
  const settings = loadSettings();
  return settings.windowState || { width: 1200, height: 800 };
}

function saveWindowState(window) {
  if (!window || window.isDestroyed()) return;

  const bounds = window.getBounds();
  const settings = loadSettings();
  settings.windowState = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    isMaximized: window.isMaximized(),
  };
  saveSettings(settings);
}

module.exports = {
  loadSettings,
  saveSettings,
  getWindowState,
  saveWindowState,
};
