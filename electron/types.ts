export interface ScreenSource {
  id: string;
  name: string;
  thumbnailDataUrl: string;
}

export interface AppInfo {
  version: string;
  name: string;
  platform: NodeJS.Platform;
  arch: string;
  userDataPath: string;
  appPath: string;
}

export interface ElectronAPI {
  // Window control
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;

  // Notifications
  notify: (title: string, body: string) => void;

  // Screen capture
  getScreenSources: () => Promise<ScreenSource[]>;

  // File system
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, data: string) => Promise<void>;
  readBinaryFile: (filePath: string) => Promise<Uint8Array>;
  writeBinaryFile: (filePath: string, data: Uint8Array) => Promise<void>;

  // Dialogs
  showOpenDialog: (options: {
    title?: string;
    filters?: { name: string; extensions: string[] }[];
    properties?: ('openFile' | 'openDirectory' | 'multiSelections')[];
  }) => Promise<string[] | undefined>;
  showSaveDialog: (options: {
    title?: string;
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
  }) => Promise<string | undefined>;

  // App info
  getAppInfo: () => Promise<AppInfo>;

  // Navigation events from tray
  onNavigate: (callback: (route: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
