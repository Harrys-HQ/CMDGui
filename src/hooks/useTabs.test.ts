import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTabs } from './useTabs';
import { ElectronAPI } from '../types';

// Mock localStorage persistence to avoid side effects
vi.mock('./usePersistence', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    loadState: vi.fn((key, defaultVal) => Promise.resolve(defaultVal)),
    saveState: vi.fn(),
  };
});

describe('useTabs Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.electron = {
      settingsGet: vi.fn(),
      settingsSet: vi.fn(),
    } as unknown as ElectronAPI;
  });

  it('should initialize with a default terminal tab', async () => {
    const { result } = renderHook(() => useTabs());
    await waitFor(() => expect(result.current.tabs).toHaveLength(1));
    expect(result.current.tabs[0].title).toBe('Terminal');
    expect(result.current.activeTabId).toBe(result.current.tabs[0].id);
  });

  it('should add a new tab', async () => {
    const { result } = renderHook(() => useTabs());
    await waitFor(() => expect(result.current.tabs).toHaveLength(1));
    
    act(() => {
      result.current.addTab();
    });

    await waitFor(() => expect(result.current.tabs).toHaveLength(2));
    expect(result.current.activeTabId).toBe(result.current.tabs[1].id);
  });

  it('should add a new tab with CWD and correct title', async () => {
    const { result } = renderHook(() => useTabs());
    await waitFor(() => expect(result.current.tabs).toHaveLength(1));
    const cwd = 'C:\\Projects\\MyApp';

    act(() => {
      result.current.addTab(cwd);
    });

    await waitFor(() => expect(result.current.tabs).toHaveLength(2));
    const newTab = result.current.tabs[1];
    expect(newTab.cwd).toBe(cwd);
    expect(newTab.title).toBe('MyApp');
  });

  it('should close a tab', async () => {
    const { result } = renderHook(() => useTabs());
    await waitFor(() => expect(result.current.tabs).toHaveLength(1));
    
    // Add a second tab so we can close one
    act(() => {
      result.current.addTab();
    });
    await waitFor(() => expect(result.current.tabs).toHaveLength(2));

    const tabToClose = result.current.tabs[0].id;
    const tabToKeep = result.current.tabs[1].id;

    act(() => {
      result.current.closeTab(tabToClose);
    });

    await waitFor(() => expect(result.current.tabs).toHaveLength(1));
    expect(result.current.tabs[0].id).toBe(tabToKeep);
  });

  it('should create a new fresh tab if the last one is closed', async () => {
    const { result } = renderHook(() => useTabs());
    await waitFor(() => expect(result.current.tabs).toHaveLength(1));
    const lastTabId = result.current.tabs[0].id;

    act(() => {
      result.current.closeTab(lastTabId);
    });

    await waitFor(() => {
      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.tabs[0].id).not.toBe(lastTabId);
    });
  });

  it('should rename a tab', async () => {
    const { result } = renderHook(() => useTabs());
    await waitFor(() => expect(result.current.tabs).toHaveLength(1));
    const tabId = result.current.tabs[0].id;

    act(() => {
      result.current.renameTab(tabId, 'New Name');
    });

    await waitFor(() => expect(result.current.tabs[0].title).toBe('New Name'));
    expect(result.current.tabs[0].isManualTitle).toBe(true);
  });

  it('should update tab status', async () => {
    const { result } = renderHook(() => useTabs());
    await waitFor(() => expect(result.current.tabs).toHaveLength(1));
    const tabId = result.current.tabs[0].id;

    act(() => {
      result.current.updateTabStatus(tabId, { hasAlert: true });
    });

    await waitFor(() => expect(result.current.tabs[0].hasAlert).toBe(true));
  });

  it('should clear notifications when a tab becomes active', async () => {
    const { result } = renderHook(() => useTabs());
    await waitFor(() => expect(result.current.tabs).toHaveLength(1));
    const tabId = result.current.tabs[0].id;

    // Set notification
    act(() => {
      result.current.updateTabStatus(tabId, { hasAlert: true });
    });
    await waitFor(() => expect(result.current.tabs[0].hasAlert).toBe(true));

    act(() => {
      result.current.clearTabNotifications(tabId);
    });

    await waitFor(() => expect(result.current.tabs[0].hasAlert).toBe(false));
  });
});
