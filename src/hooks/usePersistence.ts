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

// Debounce timer for saveState
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const saveQueue: Record<string, unknown> = {};
const pendingResolves: (() => void)[] = [];

export const saveState = async <T>(key: string, value: T): Promise<void> => {
  // Update the queue with the latest value for this key
  saveQueue[key] = value;

  // Clear existing timer
  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  // Set a new timer to save after 500ms of inactivity
  return new Promise((resolve) => {
    pendingResolves.push(resolve);

    saveTimer = setTimeout(async () => {
      saveTimer = null;
      const keysToSave = Object.keys(saveQueue);
      
      for (const k of keysToSave) {
        const val = saveQueue[k];
        try {
          await window.electron.settingsSet(k, val);
          delete saveQueue[k];
        } catch (e) {
          console.error('Failed to save Electron state for ' + k, e);
        }
      }
      
      // Resolve all pending promises
      const resolves = [...pendingResolves];
      pendingResolves.length = 0;
      resolves.forEach(res => res());
    }, 500);
  });
};