export const loadLocalState = <T>(key: string, defaultVal: T): T => {
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved state for ' + key, e);
    }
  }
  return defaultVal;
};

export const saveLocalState = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save state for ' + key, e);
  }
};

// Async Electron-based persistence
export const loadState = async <T>(key: string, defaultVal: T): Promise<T> => {
  try {
    const saved = await window.electron.settingsGet<T>(key);
    if (saved !== null && saved !== undefined) {
      return saved;
    }
  } catch (e) {
    console.error('Failed to load Electron state for ' + key, e);
  }
  return defaultVal;
};

export const saveState = async <T>(key: string, value: T): Promise<void> => {
  try {
    await window.electron.settingsSet(key, value);
  } catch (e) {
    console.error('Failed to save Electron state for ' + key, e);
  }
};