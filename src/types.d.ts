export interface Pane {
  id: string;
  cwd?: string;
  initialCommand?: string;
  envVars?: Record<string, string>;
  isAdmin?: boolean;
}

export interface PaneLayout {
  type: 'terminal' | 'split';
  paneId?: string; // If type is 'terminal'
  splitDirection?: 'horizontal' | 'vertical'; // If type is 'split'
  children?: [PaneLayout, PaneLayout]; // If type is 'split'
}

export interface Tab {
  id: string;
  title: string;
  layout: PaneLayout;
  panes: Record<string, Pane>;
  isManualTitle?: boolean;
  hasAlert?: boolean;
  hasConfirmation?: boolean;
}

export interface Project {
  name: string;
  path: string;
  type?: string;
  scripts?: Record<string, string>;
  startupCommand?: string;
  envVars?: Record<string, string>;
  gitBranch?: string;
  gitDirty?: boolean;
}

export interface ProjectDetails {
  type: string;
  scripts: Record<string, string>;
  envVars: Record<string, string>;
  gitBranch: string | null;
  gitDirty: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  tabs: Tab[];
  activeTabId: string;
}

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

export type SidebarAction =
  | { action: 'close-tab'; id: string }
  | { action: 'rename-tab'; id: string }
  | { action: 'remove-project'; path: string };

export interface UpdateInfo {
  version: string;
  files: { url: string; sha512: string; size: number }[];
  path: string;
  sha512: string;
  releaseDate: string;
  releaseName?: string;
  releaseNotes?: string;
}

export interface UpdateProgress {
  total: number;
  delta: number;
  transferred: number;
  percent: number;
  bytesPerSecond: number;
}

export interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  info?: UpdateInfo;
  progress?: UpdateProgress;
  error?: string;
}

export type ContextMenuData = { id: string } | { path: string };

export interface ElectronAPI {
  createTerminal: (options?: {
    cols?: number;
    rows?: number;
    cwd?: string;
    shell?: string;
    envVars?: Record<string, string>;
  }) => Promise<number>;
  onTerminalData: (pid: number, callback: (data: string) => void) => () => void;
  onTerminalExit: (pid: number, callback: () => void) => () => void;
  writeTerminal: (pid: number, data: string) => void;
  resizeTerminal: (pid: number, cols: number, rows: number) => void;
  killTerminal: (pid: number) => void;
  selectFolder: () => Promise<string | null>;
  getProjectInfo: (path: string) => Promise<string>;
  getProjectDetails: (path: string) => Promise<ProjectDetails>;
  listDirectory: (path: string) => Promise<FileEntry[]>;
  checkAdmin: () => Promise<boolean>;
  relaunchAdmin: () => void;
  openExternal: (url: string) => Promise<void>;
  openLocalPath: (filePath: string) => Promise<boolean>;
  checkForUpdates: () => Promise<{ success: boolean; updateInfo?: UpdateInfo; error?: string }>;
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
  quitAndInstall: () => Promise<void>;
  onUpdateStatus: (callback: (data: UpdateStatus) => void) => () => void;
  getVersion: () => Promise<string>;
  setQuakeMode: (enabled: boolean) => void;
  setStayAwake: (enabled: boolean) => void;
  settingsGet: <T>(key: string) => Promise<T | null>;
  settingsSet: (key: string, value: unknown) => Promise<void>;

  // File Operations
  fileCreate: (path: string) => Promise<{ success: boolean; error?: string }>;
  fileMkdir: (path: string) => Promise<{ success: boolean; error?: string }>;
  fileRename: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>;
  fileDelete: (path: string) => Promise<{ success: boolean; error?: string }>;
  fileShowInFolder: (path: string) => Promise<{ success: boolean; error?: string }>;

  showContextMenu: (type: string, data?: ContextMenuData) => Promise<void>;
  onTerminalContextAction: (callback: (action: string) => void) => () => void;
  onSidebarContextAction: (callback: (data: SidebarAction) => void) => () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
