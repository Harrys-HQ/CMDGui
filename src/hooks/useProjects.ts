import { useState, useEffect, useCallback } from 'react';
import { Project } from '../types';
import { loadState, saveState } from './usePersistence';

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const init = async () => {
      const savedProjectsRaw = await loadState<Project[]>('projects', []);
      const savedProjects = Array.isArray(savedProjectsRaw) ? savedProjectsRaw : [];
      const validated = savedProjects.filter((p) => p && typeof p === 'object');
      setProjects(validated);
      setIsLoaded(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveState('projects', projects);
    }
  }, [projects, isLoaded]);

  // Detect Project Types
  useEffect(() => {
    if (!isLoaded || !window.electron) return;

    const safeProjects = Array.isArray(projects) ? projects : [];
    const needsDetection = safeProjects.some((p) => p && !p.type);
    if (!needsDetection) return;

    const detectTypes = async () => {
      if (!window.electron) return;
      let changed = false;
      const updatedProjects = await Promise.all(
        safeProjects.map(async (p) => {
          if (!p.type) {
            const details = await window.electron.getProjectDetails(p.path);
            changed = true;
            return {
              ...p,
              type: details.type,
              scripts: details.scripts,
              envVars: details.envVars,
              gitBranch: details.gitBranch || undefined,
              gitDirty: details.gitDirty,
              gitFiles: details.gitFiles,
            };
          }
          return p;
        })
      );

      if (changed) {
        setProjects(updatedProjects);
      }
    };
    detectTypes();
  }, [projects, isLoaded]);

  const refreshGitStatus = useCallback(async () => {
    if (!window.electron || !isLoaded) return;
    const safeProjects = Array.isArray(projects) ? projects : [];
    const updatedProjects = await Promise.all(
      safeProjects.map(async (p) => {
        const details = await window.electron.getProjectDetails(p.path);
        return {
          ...p,
          gitBranch: details.gitBranch || undefined,
          gitDirty: details.gitDirty,
          gitFiles: details.gitFiles,
          // Update type and scripts as well while we're at it
          type: details.type,
          scripts: details.scripts,
        };
      })
    );
    // Only update state if something actually changed to avoid re-renders
    if (JSON.stringify(updatedProjects) !== JSON.stringify(projects)) {
      setProjects(updatedProjects);
    }
  }, [projects, isLoaded]);

  // Periodic Git Status Refresh (every 30 seconds)
  useEffect(() => {
    if (!isLoaded) return;
    refreshGitStatus(); // Refresh immediately on load
    const interval = setInterval(refreshGitStatus, 30000);
    return () => clearInterval(interval);
  }, [isLoaded, refreshGitStatus]);

  const addProject = useCallback(async (path?: string) => {
    if (!window.electron) return;
    const folderPath = path || await window.electron.selectFolder();
    if (folderPath) {
      const name = folderPath.split(/[\\/]/).pop() || folderPath;
      setProjects((prev) => {
        if (prev.some((p) => p.path === folderPath)) return prev;
        return [...prev, { name, path: folderPath }];
      });
    }
  }, []);

  const removeProject = useCallback((path: string) => {
    setProjects((prev) => prev.filter((p) => p.path !== path));
  }, []);

  const reorderProjects = useCallback((startIndex: number, endIndex: number) => {
    setProjects((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  }, []);

  return {
    projects,
    addProject,
    removeProject,
    reorderProjects,
    refreshGitStatus,
    isLoaded,
  };
};
