
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useKeybindings, isKeyMatch, Keybinding } from './useKeybindings';

// Mock persistence
vi.mock('./usePersistence', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    loadState: vi.fn((key, defaultVal) => Promise.resolve(defaultVal)),
    saveState: vi.fn(),
  };
});

describe('useKeybindings Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default keymap', async () => {
    const { result } = renderHook(() => useKeybindings());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    
    expect(result.current.keymap.commandPalette.key).toBe('p');
    expect(result.current.keymap.commandPalette.ctrlKey).toBe(true);
  });

  it('should update a keybinding', async () => {
    const { result } = renderHook(() => useKeybindings());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    const newBinding: Keybinding = { key: 'k', ctrlKey: true, altKey: true };
    
    act(() => {
      result.current.updateKeybinding('commandPalette', newBinding);
    });

    expect(result.current.keymap.commandPalette).toEqual(newBinding);
  });

  it('should reset keybindings', async () => {
    const { result } = renderHook(() => useKeybindings());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    const newBinding: Keybinding = { key: 'k', ctrlKey: true };
    
    act(() => {
      result.current.updateKeybinding('commandPalette', newBinding);
    });
    expect(result.current.keymap.commandPalette).toEqual(newBinding);

    act(() => {
      result.current.resetKeybindings();
    });

    expect(result.current.keymap.commandPalette.key).toBe('p');
  });
});

describe('isKeyMatch Utility', () => {
  it('should match simple key', () => {
    const event = { key: 'a', ctrlKey: false, shiftKey: false, altKey: false, metaKey: false } as KeyboardEvent;
    const binding = { key: 'a' };
    expect(isKeyMatch(event, binding)).toBe(true);
  });

  it('should match complex combination', () => {
    const event = { key: 'P', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false } as KeyboardEvent;
    const binding = { key: 'p', ctrlKey: true, shiftKey: true };
    expect(isKeyMatch(event, binding)).toBe(true);
  });

  it('should fail on mismatch', () => {
    const event = { key: 'p', ctrlKey: true, shiftKey: false, altKey: false, metaKey: false } as KeyboardEvent;
    const binding = { key: 'p', ctrlKey: true, shiftKey: true };
    expect(isKeyMatch(event, binding)).toBe(false);
  });
});
