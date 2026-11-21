import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjects } from './useProjects';
import { ElectronAPI, ProjectUpdate } from '../types';
import { loadState } from './usePersistence';

// Mock persistence
vi.mock('./usePersistence', () => ({
  loadState: vi.fn((key, defaultVal) => Promise.resolve(defaultVal)),
  saveState: vi.fn(),
}));

describe('useProjects Hook', () => {
  const mockGetProjectInfo = vi.fn();
  const mockGetProjectUpdate = vi.fn();
  const mockSelectFolder = vi.fn();
  const mockSettingsGet = vi.fn();
  const mockSettingsSet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Electron API
    mockGetProjectUpdate.mockResolvedValue({
      metadata: { type: 'generic', scripts: {}, envVars: {} },
      metadataVersion: 'fixture',
      gitBranch: null,
      gitDirty: false,
      gitFiles: [],
    });

    window.electron = {
      getProjectInfo: mockGetProjectInfo,
      getProjectUpdate: mockGetProjectUpdate,
      selectFolder: mockSelectFolder,
      settingsGet: mockSettingsGet,
      settingsSet: mockSettingsSet,
    } as unknown as ElectronAPI;
  });

  it('should initialize with empty projects', async () => {
    const { result } = renderHook(() => useProjects());
    // Initial state is empty, but it stays empty if no persistence
    await waitFor(() => expect(result.current.projects).toEqual([]));
  });

  it('should add a project', async () => {
    const folderPath = 'C:\\Projects\\MyApp';
    mockSelectFolder.mockResolvedValue(folderPath);
    mockGetProjectInfo.mockResolvedValue('react');

    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.projects).toEqual([]));

    await act(async () => {
      await result.current.addProject();
    });

    await waitFor(() => expect(result.current.projects).toHaveLength(1));
    expect(result.current.projects[0].path).toBe(folderPath);
    expect(result.current.projects[0].name).toBe('MyApp');
  });

  it('should remove a project', async () => {
    const folderPath = 'C:\\Projects\\MyApp';
    mockSelectFolder.mockResolvedValue(folderPath);
    mockGetProjectInfo.mockResolvedValue('react');

    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.projects).toEqual([]));

    await act(async () => {
      await result.current.addProject();
    });

    await waitFor(() => expect(result.current.projects).toHaveLength(1));

    act(() => {
      result.current.removeProject(folderPath);
    });

    await waitFor(() => expect(result.current.projects).toHaveLength(0));
  });

  it('should detect project type automatically', async () => {
    const folderPath = 'C:\\Projects\\Api';
    mockSelectFolder.mockResolvedValue(folderPath);
    mockGetProjectUpdate.mockResolvedValue({
      metadata: { type: 'node', scripts: { start: 'node index.js' }, envVars: {} },
      metadataVersion: 'fixture',
      gitBranch: 'main',
      gitDirty: false,
      gitFiles: [],
    });

    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.projects).toEqual([]));

    await act(async () => {
      await result.current.addProject();
    });

    // Wait for the async detection to update the state
    await waitFor(() => {
      expect(result.current.projects[0].type).toBe('node');
    });
  });
  it('keeps one polling interval and sends the metadata version on later requests', async () => {
    vi.useFakeTimers();
    const interval = vi.spyOn(globalThis, 'setInterval');
    vi.mocked(loadState).mockResolvedValueOnce([{ name: 'App', path: '/app', type: 'node' }]);
    const { result, unmount } = renderHook(() => useProjects());
    try {
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.isLoaded).toBe(true);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(mockGetProjectUpdate).toHaveBeenCalledTimes(1);
      expect(interval).toHaveBeenCalledTimes(1);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });
      expect(mockGetProjectUpdate).toHaveBeenCalledTimes(2);
      expect(mockGetProjectUpdate).toHaveBeenLastCalledWith('/app', 'fixture');
      expect(interval).toHaveBeenCalledTimes(1);
    } finally {
      unmount();
      interval.mockRestore();
      vi.useRealTimers();
    }
  });

  it('limits concurrent queries and does not resurrect a project removed during a poll', async () => {
    vi.useFakeTimers();
    const projects = Array.from({ length: 6 }, (_, index) => ({
      name: `App ${index}`,
      path: `/app/${index}`,
      type: 'node',
    }));
    vi.mocked(loadState).mockResolvedValueOnce(projects);
    const pending: ((details: ProjectUpdate) => void)[] = [];
    mockGetProjectUpdate.mockImplementation(
      () =>
        new Promise((resolve) => {
          pending.push(resolve);
        })
    );
    const { result, unmount } = renderHook(() => useProjects());
    const details: ProjectUpdate = {
      metadata: { type: 'node', scripts: {}, envVars: {} },
      metadataVersion: 'fixture',
      gitBranch: 'main',
      gitDirty: false,
      gitFiles: [],
    };
    try {
      await act(async () => {
        await Promise.resolve();
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(mockGetProjectUpdate).toHaveBeenCalledTimes(4);
      act(() => {
        result.current.removeProject('/app/0');
      });
      await act(async () => {
        pending.splice(0).forEach((resolve) => resolve(details));
        await Promise.resolve();
      });
      expect(mockGetProjectUpdate).toHaveBeenCalledTimes(6);
      await act(async () => {
        pending.splice(0).forEach((resolve) => resolve(details));
      });
      expect(result.current.projects).toHaveLength(5);
      expect(result.current.projects.some((project) => project.path === '/app/0')).toBe(false);
      expect(result.current.projects.every((project) => project.gitBranch === 'main')).toBe(true);
    } finally {
      unmount();
      vi.useRealTimers();
    }
  });
});
