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

type ReadRequest = {
  key: string;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
};
let readQueue: ReadRequest[] = [];

const readSetting = (key: string): Promise<unknown> =>
  new Promise((resolve, reject) => {
    if (readQueue.length === 0) {
      queueMicrotask(async () => {
        const requests = readQueue;
        readQueue = [];
        try {
          const keys = [...new Set(requests.map((request) => request.key))];
          const values = await window.electron.settingsGetMany(keys);
          requests.forEach((request) =>
            request.resolve(Object.hasOwn(values, request.key) ? values[request.key] : undefined)
          );
        } catch (error) {
          requests.forEach((request) => request.reject(error));
        }
      });
    }
    readQueue.push({ key, resolve, reject });
  });

// Async Tauri-based persistence with fallback timeout
export const loadState = async <T>(key: string, defaultVal: T): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    if (!window.electron) {
      console.warn('window.electron not available for loadState');
      return defaultVal;
    }

    const fetchPromise = readSetting(key);
    const timeoutPromise = new Promise<null>((resolve) => {
      timeout = setTimeout(() => {
        console.warn(`loadState timeout for key "${key}", falling back to default.`);
        resolve(null);
      }, 1500);
    });

    const saved = await Promise.race([fetchPromise, timeoutPromise]);
    return validateLoaded(saved, defaultVal);
  } catch (e) {
    console.error('Failed to load Tauri state for ' + key, e);
  } finally {
    clearTimeout(timeout);
  }
  return defaultVal;
};

// Debounce timer for saveState
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let saveQueue = new Map<string, unknown>();
let pendingResolves: (() => void)[] = [];
let saving = false;

async function flushSettings() {
  saveTimer = undefined;
  if (saving) return;
  saving = true;
  const changes = saveQueue;
  const resolves = pendingResolves;
  saveQueue = new Map();
  pendingResolves = [];
  try {
    await window.electron.settingsSetMany(Object.fromEntries(changes));
  } catch (error) {
    console.error('Failed to save settings:', error);
    for (const [key, value] of changes) {
      if (!saveQueue.has(key)) saveQueue.set(key, value);
    }
  } finally {
    saving = false;
    resolves.forEach((resolve) => resolve());
    if (saveTimer === undefined && pendingResolves.length > 0) void flushSettings();
  }
}

export const saveState = async <T>(key: string, value: T): Promise<void> => {
  if (!window.electron) {
    console.warn('window.electron not available for saveState');
    return Promise.resolve();
  }
  // Update the queue with the latest value for this key
  saveQueue.set(key, value);

  // Clear existing timer
  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  // Set a new timer to save after 500ms of inactivity
  return new Promise((resolve) => {
    pendingResolves.push(resolve);

    saveTimer = setTimeout(() => void flushSettings(), 500);
  });
};
