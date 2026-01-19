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
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
