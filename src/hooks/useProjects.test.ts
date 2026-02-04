import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjects } from './useProjects';
import { ElectronAPI } from '../types';

// Mock persistence
vi.mock('./usePersistence', () => ({
  loadState: vi.fn((key, defaultVal) => Promise.resolve(defaultVal)),
  saveState: vi.fn(),
}));

describe('useProjects Hook', () => {
  const mockGetProjectInfo = vi.fn();
  const mockSelectFolder = vi.fn();
  const mockSettingsGet = vi.fn();
  const mockSettingsSet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Electron API
    window.electron = {
      getProjectInfo: mockGetProjectInfo,
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
     mockGetProjectInfo.mockResolvedValue('node');
     
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
});
