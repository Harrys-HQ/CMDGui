export const cleanTerminalTitle = (
  rawTitle: string,
  currentTitle: string | undefined,
  isManualTitle: boolean | undefined
): string | null => {
  if (isManualTitle) return null;

  let cleanTitle = rawTitle;
  if (cleanTitle.startsWith('Administrator: ')) {
    cleanTitle = cleanTitle.replace('Administrator: ', '');
  }

  const genericTitles = [
    'Windows PowerShell',
    'powershell.exe',
    'pwsh.exe',
    'pwsh',
    'cmd.exe',
    'Command Prompt',
    'Terminal',
  ];

  // If the new title is generic, and we already have a specific title (that isn't generic), keep the old one.
  if (genericTitles.includes(cleanTitle) && currentTitle && !genericTitles.includes(currentTitle)) {
    return null;
  }

  if (cleanTitle.includes('\\')) {
    cleanTitle = cleanTitle.split('\\').pop() || cleanTitle;
  }

  return cleanTitle !== currentTitle ? cleanTitle : null;
};

// Global PTY registry to persist processes during layout shifts (splits) and hibernation
export const globalPtyRegistry: Record<
  string,
  {
    pid: string;
    cleanupData?: () => void;
    cleanupExit?: () => void;
    dataBuffer?: string[];
    lastActive?: number;
  }
> = {};

const killedPanes = new Set<string>();

export const killTerminalProcess = (paneId: string) => {
  killedPanes.add(paneId);
  const pty = globalPtyRegistry[paneId];
  if (pty) {
    if (pty.cleanupData) pty.cleanupData();
    if (pty.cleanupExit) pty.cleanupExit();
    if (window.electron && window.electron.killTerminal) {
      window.electron.killTerminal(pty.pid);
    }
    delete globalPtyRegistry[paneId];
  }

  // Clear persisted terminal buffer when pane is killed
  if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
    localStorage.removeItem(`terminal_buffer_${paneId}`);
  }
};

export const isPaneKilled = (paneId: string) => killedPanes.has(paneId);
export const cleanupKilledPane = (paneId: string) => killedPanes.delete(paneId);

/**
 * Clears terminal buffers from localStorage that are no longer associated with active panes.
 */
export const clearOrphanedBuffers = (activePaneIds: string[]) => {
  const keys = Object.keys(localStorage);
  const bufferKeys = keys.filter((k) => k.startsWith('terminal_buffer_'));
  bufferKeys.forEach((key) => {
    const paneId = key.replace('terminal_buffer_', '');
    if (!activePaneIds.includes(paneId)) {
      localStorage.removeItem(key);
    }
  });
};
