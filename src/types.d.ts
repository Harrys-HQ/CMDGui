export interface Tab {
  id: string;
  title: string;
  cwd?: string;
  isManualTitle?: boolean;
  hasAlert?: boolean;
  hasConfirmation?: boolean;
  isAdmin?: boolean;
}

export interface Project {
  name: string;
  path: string;
  type?: string;
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
  createTerminal: (options?: { cols?: number; rows?: number; cwd?: string }) => Promise<number>;
  onTerminalData: (pid: number, callback: (data: string) => void) => () => void;
  onTerminalExit: (pid: number, callback: () => void) => void;
  writeTerminal: (pid: number, data: string) => void;
  resizeTerminal: (pid: number, cols: number, rows: number) => void;
  killTerminal: (pid: number) => void;
  selectFolder: () => Promise<string | null>;
  getProjectInfo: (path: string) => Promise<string>;
  checkAdmin: () => Promise<boolean>;
  relaunchAdmin: () => void;
  openExternal: (url: string) => Promise<void>;
  checkForUpdates: () => Promise<{ success: boolean; updateInfo?: UpdateInfo; error?: string }>;
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
  quitAndInstall: () => Promise<void>;
  onUpdateStatus: (callback: (data: UpdateStatus) => void) => () => void;
  getVersion: () => Promise<string>;
  showContextMenu: (type: string, data?: ContextMenuData) => Promise<void>;
  onTerminalContextAction: (callback: (action: string) => void) => () => void;
  onSidebarContextAction: (callback: (data: SidebarAction) => void) => () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
