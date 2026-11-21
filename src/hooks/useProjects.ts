import { useState, useEffect, useCallback, useRef } from 'react';
import { Project, ProjectUpdate } from '../types';
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

  const projectsRef = useRef(projects);
  const refreshingRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshGitStatus = useCallback(async () => {
    if (!window.electron || !isLoaded || refreshingRef.current) return;
    refreshingRef.current = true;
    const snapshot = projectsRef.current;
    const updates = new Map<Project, ProjectUpdate>();
    let next = 0;
    try {
      // Bound concurrent git subprocesses, including initial type detection.
      await Promise.all(
        Array.from({ length: Math.min(4, snapshot.length) }, async () => {
          while (next < snapshot.length) {
            const project = snapshot[next++];
            try {
              const update = await window.electron.getProjectUpdate(
                project.path,
                project.type ? project.metadataVersion : undefined
              );
              updates.set(project, update);
            } catch (error) {
              console.warn(`Failed to refresh project ${project.path}:`, error);
            }
          }
        })
      );
      if (mountedRef.current)
        setProjects((current) => {
          // Merge into current state so a slow poll cannot resurrect removed projects.
          let changed = false;
          const updated = current.map((project) => {
            const update = updates.get(project);
            if (!update) return project;
            const gitBranch = update.gitBranch ?? undefined;
            const gitFiles = project.gitFiles ?? [];
            if (
              !update.metadata &&
              gitBranch === project.gitBranch &&
              update.gitDirty === project.gitDirty &&
              update.gitFiles.length === gitFiles.length &&
              update.gitFiles.every((file, index) => file === gitFiles[index])
            )
              return project;
            changed = true;
            return {
              ...project,
              ...update.metadata,
              metadataVersion: update.metadataVersion,
              gitBranch,
              gitDirty: update.gitDirty,
              gitFiles: update.gitFiles,
            };
          });
          return changed ? updated : current;
        });
    } finally {
      refreshingRef.current = false;
    }
  }, [isLoaded]);

  useEffect(() => {
    if (projects.some((project) => !project.type)) void refreshGitStatus();
  }, [projects, refreshGitStatus]);

  // Periodic Git Status Refresh (every 30 seconds)
  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      refreshGitStatus();
    }, 0);
    const interval = setInterval(refreshGitStatus, 30000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [isLoaded, refreshGitStatus]);

  const addProject = useCallback(async (path?: string) => {
    if (!window.electron) return;
    const folderPath = path || (await window.electron.selectFolder());
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
