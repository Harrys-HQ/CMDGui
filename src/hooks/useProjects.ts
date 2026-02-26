import { useState, useEffect, useCallback } from 'react';
import { Project } from '../types';
import { loadState, saveState } from './usePersistence';

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const init = async () => {
      const savedProjects = await loadState<Project[]>('projects', []);
      setProjects(savedProjects);
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
    if (!isLoaded) return;
    
    // Check if any project needs type detection to avoid redundant processing
    const needsDetection = projects.some(p => !p.type);
    if (!needsDetection) return;

    const detectTypes = async () => {
      let changed = false;
      const updatedProjects = await Promise.all(
        projects.map(async (p) => {
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

  const addProject = useCallback(async () => {
    const folderPath = await window.electron.selectFolder();
    if (folderPath) {
      const name = folderPath.split('\\').pop() || folderPath;
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
  };
};
