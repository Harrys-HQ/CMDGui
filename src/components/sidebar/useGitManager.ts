import { useState } from 'react';
import type { Project } from '../../types';

export function useGitManager(projects: Project[]) {
  const [requestedGitPath, setSelectedGitPath] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [isPending, setIsPending] = useState(false);
  const gitProjects = (Array.isArray(projects) ? projects : []).filter(
    (p) =>
      p &&
      typeof p === 'object' &&
      (p.gitBranch !== undefined || (Array.isArray(p.gitFiles) && p.gitFiles.length > 0))
  );

  const selectedGitPath = gitProjects.some((project) => project.path === requestedGitPath)
    ? requestedGitPath
    : (gitProjects[0]?.path ?? null);

  return {
    gitProjects,
    selectedGitPath,
    setSelectedGitPath,
    commitMessage,
    setCommitMessage,
    isPending,
    setIsPending,
  };
}
