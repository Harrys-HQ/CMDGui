import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTabs } from './useTabs';
import * as Persistence from './usePersistence';

// Mock localStorage persistence to avoid side effects
vi.mock('./usePersistence', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    loadState: vi.fn((key, defaultVal) => defaultVal),
    saveState: vi.fn(),
  };
});

describe('useTabs Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with a default terminal tab', () => {
    const { result } = renderHook(() => useTabs());
    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.tabs[0].title).toBe('Terminal');
    expect(result.current.activeTabId).toBe(result.current.tabs[0].id);
  });

  it('should add a new tab', () => {
    const { result } = renderHook(() => useTabs());
    
    act(() => {
      result.current.addTab();
    });

    expect(result.current.tabs).toHaveLength(2);
    expect(result.current.activeTabId).toBe(result.current.tabs[1].id);
  });

  it('should add a new tab with CWD and correct title', () => {
    const { result } = renderHook(() => useTabs());
    const cwd = 'C:\\Projects\\MyApp';

    act(() => {
      result.current.addTab(cwd);
    });

    const newTab = result.current.tabs[1];
    expect(newTab.cwd).toBe(cwd);
    expect(newTab.title).toBe('MyApp');
  });

  it('should close a tab', () => {
    const { result } = renderHook(() => useTabs());
    
    // Add a second tab so we can close one
    act(() => {
      result.current.addTab();
    });
    const tabToClose = result.current.tabs[0].id;
    const tabToKeep = result.current.tabs[1].id;

    act(() => {
      result.current.closeTab(tabToClose);
    });

    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.tabs[0].id).toBe(tabToKeep);
  });

  it('should create a new fresh tab if the last one is closed', () => {
    const { result } = renderHook(() => useTabs());
    const lastTabId = result.current.tabs[0].id;

    act(() => {
      result.current.closeTab(lastTabId);
    });

    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.tabs[0].id).not.toBe(lastTabId);
  });

  it('should rename a tab', () => {
    const { result } = renderHook(() => useTabs());
    const tabId = result.current.tabs[0].id;

    act(() => {
      result.current.renameTab(tabId, 'New Name');
    });

    expect(result.current.tabs[0].title).toBe('New Name');
    expect(result.current.tabs[0].isManualTitle).toBe(true);
  });

  it('should update tab status', () => {
    const { result } = renderHook(() => useTabs());
    const tabId = result.current.tabs[0].id;

    act(() => {
      result.current.updateTabStatus(tabId, { hasAlert: true });
    });

    expect(result.current.tabs[0].hasAlert).toBe(true);
  });

  it('should clear notifications when a tab becomes active', () => {
    const { result } = renderHook(() => useTabs());
    const tabId = result.current.tabs[0].id;

    // Set notification
    act(() => {
      result.current.updateTabStatus(tabId, { hasAlert: true });
    });
    expect(result.current.tabs[0].hasAlert).toBe(true);

    // Activating the tab (conceptually) triggers the effect in the component, 
    // but here we test the `clearTabNotifications` function directly.
    act(() => {
      result.current.clearTabNotifications(tabId);
    });

    expect(result.current.tabs[0].hasAlert).toBe(false);
  });
});
