export const loadState = <T,>(key: string, defaultVal: T): T => {
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse saved state for " + key, e);
    }
  }
  return defaultVal;
};

export const saveState = <T,>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};
