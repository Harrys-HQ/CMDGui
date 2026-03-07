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

// Global PTY registry to persist processes during layout shifts (splits)
export const globalPtyRegistry: Record<
  string,
  { pid: number; cleanupData?: () => void; cleanupExit?: () => void }
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
};

export const isPaneKilled = (paneId: string) => killedPanes.has(paneId);
export const cleanupKilledPane = (paneId: string) => killedPanes.delete(paneId);
