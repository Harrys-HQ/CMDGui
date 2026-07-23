import { useState, useEffect, useCallback } from 'react';
import { loadState, saveState } from './usePersistence';

export type KeybindingAction =
  | 'commandPalette'
  | 'newTab'
  | 'closeTab'
  | 'nextTab'
  | 'prevTab'
  | 'clearTerminal'
  | 'copy'
  | 'paste'
  | 'find'
  | 'newLine'
  | 'splitHorizontal'
  | 'splitVertical'
  | 'closePane'
  | 'toggleSidebar';

export interface Keybinding {
  key: string; // e.g., 'p', 'c'
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
}

export type Keymap = Record<KeybindingAction, Keybinding>;

const DEFAULT_KEYMAP: Keymap = {
  commandPalette: { key: 'p', ctrlKey: true, shiftKey: true },
  newTab: { key: 'n', ctrlKey: true, shiftKey: true },
  closeTab: { key: 'w', ctrlKey: true, shiftKey: true },
  nextTab: { key: 'Tab', ctrlKey: true },
  prevTab: { key: 'Tab', ctrlKey: true, shiftKey: true },
  clearTerminal: { key: 'l', ctrlKey: true, shiftKey: true }, // Changed to Ctrl+Shift+L
  copy: { key: 'c', ctrlKey: true, shiftKey: true },
  paste: { key: 'v', ctrlKey: true, shiftKey: true },
  find: { key: 'f', ctrlKey: true, shiftKey: true }, // Changed to Ctrl+Shift+F
  newLine: { key: 'Enter', shiftKey: true }, // Changed to Shift+Enter
  splitHorizontal: { key: 'h', ctrlKey: true, altKey: true },
  splitVertical: { key: 'v', ctrlKey: true, altKey: true },
  closePane: { key: 'w', ctrlKey: true, altKey: true },
  toggleSidebar: { key: 'b', ctrlKey: true },
};

export const formatKeybinding = (binding: Keybinding): string => {
  if (!binding) return '';
  const parts = [];
  if (binding.ctrlKey) parts.push('Ctrl');
  if (binding.altKey) parts.push('Alt');
  if (binding.shiftKey) parts.push('Shift');
  if (binding.metaKey) parts.push('Meta');

  let key = (binding.key || '').toUpperCase();
  if (key === ' ') key = 'Space';
  if (!key) return '';

  parts.push(key);
  return parts.join('+');
};

export const isKeyMatch = (
  event: KeyboardEvent | React.KeyboardEvent,
  binding: Keybinding
): boolean => {
  if (!binding) return false;
  if (event.ctrlKey !== !!binding.ctrlKey) return false;
  if (event.shiftKey !== !!binding.shiftKey) return false;
  if (event.altKey !== !!binding.altKey) return false;
  if (event.metaKey !== !!binding.metaKey) return false;

  if (!binding.key) return false;
  return event.key.toLowerCase() === binding.key.toLowerCase();
};

export const useKeybindings = () => {
  const [keymap, setKeymap] = useState<Keymap>(DEFAULT_KEYMAP);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const init = async () => {
      const savedKeymap = await loadState<Keymap>('keymap', DEFAULT_KEYMAP);
      const validatedKeymap = typeof savedKeymap === 'object' && savedKeymap ? savedKeymap : {};
      // Merge with default to ensure new keys are added if missing
      setKeymap({ ...DEFAULT_KEYMAP, ...validatedKeymap });
      setIsLoaded(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveState('keymap', keymap);
    }
  }, [keymap, isLoaded]);

  const updateKeybinding = useCallback((action: KeybindingAction, binding: Keybinding) => {
    setKeymap((prev) => ({ ...prev, [action]: binding }));
  }, []);

  const resetKeybindings = useCallback(() => {
    setKeymap(DEFAULT_KEYMAP);
  }, []);

  return {
    keymap,
    updateKeybinding,
    resetKeybindings,
    isLoaded,
  };
};
