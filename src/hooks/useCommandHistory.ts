import { useState, useEffect, useCallback } from 'react';
import { loadLocalState, saveLocalState } from './usePersistence';

export interface HistoryItem {
  id: string;
  command: string;
  timestamp: number;
  isBookmarked?: boolean;
}

export const useCommandHistory = () => {
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const loaded = loadLocalState<HistoryItem[]>('commandHistory', []);
    return Array.isArray(loaded) ? loaded : [];
  });

  useEffect(() => {
    saveLocalState('commandHistory', history);
  }, [history]);

  const addHistory = useCallback((command: string) => {
    const trimmed = command.trim();
    if (!trimmed) return;

    setHistory((prev) => {
      // Remove duplicate if exists to bring it to top
      const filtered = prev.filter((h) => h.command !== trimmed);
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        command: trimmed,
        timestamp: Date.now(),
      };
      return [newItem, ...filtered].slice(0, 500); // Keep last 500
    });
  }, []);

  const toggleBookmark = useCallback((id: string) => {
    setHistory((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.map((h) => (h.id === id ? { ...h, isBookmarked: !h.isBookmarked } : h));
    });
  }, []);

  const removeHistory = useCallback((id: string) => {
    setHistory((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.filter((h) => h.id !== id);
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.filter((h) => h.isBookmarked);
    });
  }, []);

  return {
    history,
    addHistory,
    toggleBookmark,
    removeHistory,
    clearHistory,
  };
};
