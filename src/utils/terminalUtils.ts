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

  if (cleanTitle.includes('\\') || cleanTitle.includes('/')) {
    cleanTitle = cleanTitle.split(/[/\\]/).filter(Boolean).pop() || cleanTitle;
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

export interface ExtractedLink {
  text: string;
  start: number;
  end: number;
  target: string;
  type: 'markdown' | 'url' | 'file' | 'tilde' | 'winpath';
}

/**
 * Extracts links from raw/wrapped terminal text, prioritizing Markdown links,
 * standard HTTP(S) URLs, file:/// URIs, tilde paths (~/...), and Windows paths.
 */
export const extractTerminalLinks = (fullText: string): ExtractedLink[] => {
  const links: ExtractedLink[] = [];
  const coveredRanges: { start: number; end: number }[] = [];

  const isCovered = (start: number, end: number) =>
    coveredRanges.some((r) => start >= r.start && end <= r.end);

  // A. Match Markdown links and images: e.g. [Label](url) or ![Alt](path)
  const mdRegex = /!?\[([^\]]+)\]\(([^)\s]+)\)/g;
  let match;
  while ((match = mdRegex.exec(fullText)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    const target = match[2];
    coveredRanges.push({ start, end });
    links.push({ text: match[0], start, end, target, type: 'markdown' });
  }

  // B. Match http/https URLs: e.g. https://github.com/...
  const httpUrlRegex = /https?:\/\/[^\s"'<>()]+/gi;
  while ((match = httpUrlRegex.exec(fullText)) !== null) {
    const start = match.index;
    const url = match[0].replace(/[)\].,;:]+$/, '');
    const end = start + url.length;
    if (isCovered(start, end)) continue;
    coveredRanges.push({ start, end });
    links.push({ text: url, start, end, target: url, type: 'url' });
  }

  // C. Match file:/// links: e.g. file:///C:/path or file:///~/path
  const fileUriRegex = /file:\/\/\/(?:[a-zA-Z]:[/\\][^\s"'<>()]+|[^\s"'<>()]+)/g;
  while ((match = fileUriRegex.exec(fullText)) !== null) {
    const start = match.index;
    const uri = match[0].replace(/[)\].,;:]+$/, '');
    const end = start + uri.length;
    if (isCovered(start, end)) continue;
    coveredRanges.push({ start, end });
    links.push({ text: uri, start, end, target: uri, type: 'file' });
  }

  // D. Match tilde (~) home paths: e.g. ~/.gemini/... or ~\AppData\...
  const tildeRegex = /(?:^|[[\s"'<(`])(~[/\\][^\s"'<>()`]+)/g;
  while ((match = tildeRegex.exec(fullText)) !== null) {
    const rawMatch = match[1];
    const start = match.index + (match[0].length - rawMatch.length);
    const tildePath = rawMatch.replace(/[)\].,;:]+$/, '');
    const end = start + tildePath.length;
    if (isCovered(start, end)) continue;
    coveredRanges.push({ start, end });
    links.push({ text: tildePath, start, end, target: tildePath, type: 'tilde' });
  }

  // E. Match Windows absolute paths (with optional leading slash, e.g. /C:/path or C:\path)
  const winPathRegex = /(?:^|[[\s"'<(`])(?:\/)?([a-zA-Z]:[/\\][^\s"'<>()`]+)/g;
  while ((match = winPathRegex.exec(fullText)) !== null) {
    const rawMatch = match[1];
    const start = match.index + (match[0].length - rawMatch.length);
    const prevStr = fullText.substring(Math.max(0, start - 8), start);
    if (prevStr.includes('file:///') || /https?:/i.test(prevStr)) continue;

    const pathStr = rawMatch.replace(/[)\].,;:]+$/, '');
    const end = start + pathStr.length;
    if (isCovered(start, end)) continue;
    coveredRanges.push({ start, end });
    links.push({ text: pathStr, start, end, target: pathStr, type: 'winpath' });
  }

  return links;
};

/**
 * Normalizes any link target into an external URL or local file/folder path.
 */
export const sanitizeLinkTarget = (rawTarget: string): { type: 'external' | 'local'; path: string } => {
  let target = rawTarget.trim().replace(/^<|>$/g, '');
  target = target.replace(/[)\].,;:]+$/, '');

  if (/^https?:\/\//i.test(target) || /^mailto:/i.test(target)) {
    return { type: 'external', path: target.replace(/\s+/g, '') };
  }

  if (/^file:\/\/\//i.test(target)) {
    let filePath = target.replace(/^file:\/\/\//i, '');
    if (/^\/?[a-zA-Z]:[/\\]/.test(filePath)) {
      filePath = filePath.replace(/^\//, '').replace(/\//g, '\\');
    }
    return { type: 'local', path: decodeURIComponent(filePath) };
  }

  let cleanPath = target;
  if (/^\/[a-zA-Z]:[/\\]/.test(cleanPath)) {
    cleanPath = cleanPath.slice(1).replace(/\//g, '\\');
  }
  return { type: 'local', path: cleanPath };
};
