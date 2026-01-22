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
    checkForUpdates: () => Promise<{ success: boolean; updateInfo?: any; error?: string }>;
    getVersion: () => Promise<string>;
    showContextMenu: (type: string, data?: any) => Promise<void>;
    onTerminalContextAction: (callback: (action: string) => void) => () => void;
    onSidebarContextAction: (callback: (data: any) => void) => () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
