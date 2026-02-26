import { useState, useEffect, useCallback } from 'react';
import { loadLocalState, saveLocalState } from './usePersistence';

export interface HistoryItem {
  id: string;
  command: string;
  timestamp: number;
  isBookmarked?: boolean;
}

export const useCommandHistory = () => {
  const [history, setHistory] = useState<HistoryItem[]>(() => 
    loadLocalState<HistoryItem[]>('commandHistory', [])
  );

  useEffect(() => {
    saveLocalState('commandHistory', history);
  }, [history]);

  const addHistory = useCallback((command: string) => {
    const trimmed = command.trim();
    if (!trimmed) return;

    setHistory((prev) => {
      // Remove duplicate if exists to bring it to top
      const filtered = prev.filter(h => h.command !== trimmed);
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        command: trimmed,
        timestamp: Date.now(),
      };
      return [newItem, ...filtered].slice(0, 500); // Keep last 500
    });
  }, []);

  const toggleBookmark = useCallback((id: string) => {
    setHistory((prev) => prev.map(h => 
      h.id === id ? { ...h, isBookmarked: !h.isBookmarked } : h
    ));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory(prev => prev.filter(h => h.isBookmarked));
  }, []);

  return {
    history,
    addHistory,
    toggleBookmark,
    clearHistory,
  };
};
