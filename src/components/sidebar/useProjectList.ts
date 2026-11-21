import React, { useState, useEffect } from 'react';
import type { Project } from '../../types';
import { loadState, saveState } from '../../hooks/usePersistence';

export function useProjectList(onReorderProjects: (start: number, end: number) => void) {
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedProjectIndex, setDraggedProjectIndex] = useState<number | null>(null);
  const [dragOverProjectIndex, setDragOverProjectIndex] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    projects: true,
    snippets: true,
  });
  const [openExplorerPath, setOpenExplorerPath] = useState<string | null>(null);
  const [snippets, setSnippets] = useState<{ id: string; name: string; command: string }[]>([]);

  useEffect(() => {
    let mounted = true;
    const loadSnippets = async () => {
      const saved = await loadState<{ id: string; name: string; command: string }[]>(
        'commandSnippets',
        [
          { id: '1', name: 'Clean Install', command: 'npm ci' },
          { id: '2', name: 'Format Code', command: 'npm run format' },
          { id: '3', name: 'Git Status', command: 'git status' },
        ]
      );
      if (mounted) {
        setSnippets(Array.isArray(saved) ? saved : []);
      }
    };
    loadSnippets();
    return () => {
      mounted = false;
    };
  }, []);

  const saveSnippets = (newSnippets: { id: string; name: string; command: string }[]) => {
    setSnippets(newSnippets);
    saveState('commandSnippets', newSnippets);
  };

  useEffect(() => {
    const loadExpandedState = async () => {
      const savedState = await loadState<{ projects: boolean; snippets: boolean }>(
        'sidebarExpandedSections',
        { projects: true, snippets: true }
      );
      if (savedState) {
        setExpandedSections(savedState);
      }
    };
    loadExpandedState();
  }, []);

  const toggleSection = (section: 'projects' | 'snippets') => {
    setExpandedSections((prev) => {
      const newState = { ...prev, [section]: !prev[section] };
      saveState('sidebarExpandedSections', newState);
      return newState;
    });
  };

  const handleProjectDragStart = (index: number) => {
    setDraggedProjectIndex(index);
  };

  const handleProjectDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedProjectIndex === null || draggedProjectIndex === index) return;
    setDragOverProjectIndex(index);
  };

  const handleProjectDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedProjectIndex !== null && draggedProjectIndex !== index) {
      onReorderProjects(draggedProjectIndex, index);
    }
    setDraggedProjectIndex(null);
    setDragOverProjectIndex(null);
  };

  const handleProjectDragEnd = () => {
    setDraggedProjectIndex(null);
    setDragOverProjectIndex(null);
  };

  const handleProjectContextMenu = (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    window.electron.showContextMenu('project', { path: project.path });
  };

  return {
    searchQuery,
    setSearchQuery,
    expandedSections,
    toggleSection,
    openExplorerPath,
    setOpenExplorerPath,
    snippets,
    saveSnippets,
    dragOverProjectIndex,
    handleProjectDragOver,
    handleProjectDrop,
    handleProjectDragStart,
    handleProjectDragEnd,
    handleProjectContextMenu,
  };
}
