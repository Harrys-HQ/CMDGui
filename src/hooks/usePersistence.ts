/**
 * Validates that a loaded value matches the expected shape of the defaultVal.
 * - If defaultVal is an Array, saved must also be an Array.
 * - If defaultVal is an object (but not array/null), saved must be an object.
 * - Otherwise returns saved as-is if it is not null/undefined.
 */
const validateLoaded = <T>(saved: unknown, defaultVal: T): T => {
  if (saved === null || saved === undefined) return defaultVal;
  if (Array.isArray(defaultVal)) {
    return (Array.isArray(saved) ? saved : defaultVal) as T;
  }
  if (defaultVal !== null && typeof defaultVal === 'object') {
    if (typeof saved === 'object' && !Array.isArray(saved) && saved !== null) {
      return saved as T;
    }
    return defaultVal;
  }
  return saved as T;
};

export const loadLocalState = <T>(key: string, defaultVal: T): T => {
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return validateLoaded(parsed, defaultVal);
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

// Async Tauri-based persistence with fallback timeout
export const loadState = async <T>(key: string, defaultVal: T): Promise<T> => {
  try {
    if (!window.electron) {
      console.warn('window.electron not available for loadState');
      return defaultVal;
    }

    const fetchPromise = window.electron.settingsGet<unknown>(key);
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => {
        console.warn(`loadState timeout for key "${key}", falling back to default.`);
        resolve(null);
      }, 1500)
    );

    const saved = await Promise.race([fetchPromise, timeoutPromise]);
    return validateLoaded(saved, defaultVal);
  } catch (e) {
    console.error('Failed to load Tauri state for ' + key, e);
  }
  return defaultVal;
};


// Debounce timer for saveState
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const saveQueue: Record<string, unknown> = {};
const pendingResolves: (() => void)[] = [];

export const saveState = async <T>(key: string, value: T): Promise<void> => {
  if (!window.electron) {
    console.warn('window.electron not available for saveState');
    return Promise.resolve();
  }
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
      resolves.forEach((res) => res());
    }, 500);
  });
};
