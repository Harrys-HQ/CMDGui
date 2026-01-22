import { useState, useEffect } from 'react';
import { Project } from '../types';
import { loadState, saveState } from './usePersistence';

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>(() => 
    loadState('projects', [])
  );

  useEffect(() => saveState('projects', projects), [projects]);

  // Detect Project Types
  useEffect(() => {
    const detectTypes = async () => {
      let changed = false;
      const updatedProjects = await Promise.all(projects.map(async (p) => {
        if (!p.type) {
          const type = await window.electron.getProjectInfo(p.path);
          changed = true;
          return { ...p, type };
        }
        return p;
      }));
      
      if (changed) {
        setProjects(updatedProjects);
      }
    };
    detectTypes();
  }, [projects.length]);

  const addProject = async () => {
    const folderPath = await window.electron.selectFolder();
    if (folderPath) {
      const name = folderPath.split('\\').pop() || folderPath;
      if (projects.some(p => p.path === folderPath)) return;
      
      const newProjects = [...projects, { name, path: folderPath }];
      setProjects(newProjects);
    }
  };

  const removeProject = (path: string) => {
    setProjects(projects.filter(p => p.path !== path));
  };

  return {
    projects,
    addProject,
    removeProject
  };
};
