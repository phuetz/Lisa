import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from './types';

const electronAPI: ElectronAPI = {
  // Window control
  minimize: () => ipcRenderer.send('electron:minimize'),
  maximize: () => ipcRenderer.send('electron:maximize'),
  close: () => ipcRenderer.send('electron:close'),
  isMaximized: () => ipcRenderer.invoke('electron:is-maximized'),

  // Notifications
  notify: (title: string, body: string) => ipcRenderer.send('electron:notify', title, body),

  // Screen capture
  getScreenSources: () => ipcRenderer.invoke('electron:screen-capture'),

  // File system
  readFile: (filePath: string) => ipcRenderer.invoke('electron:fs-read', filePath),
  writeFile: (filePath: string, data: string) => ipcRenderer.invoke('electron:fs-write', filePath, data),
  readBinaryFile: (filePath: string) => ipcRenderer.invoke('electron:fs-read-binary', filePath),
  writeBinaryFile: (filePath: string, data: Uint8Array) => ipcRenderer.invoke('electron:fs-write-binary', filePath, data),

  // Dialogs
  showOpenDialog: (options) => ipcRenderer.invoke('electron:dialog-open', options),
  showSaveDialog: (options) => ipcRenderer.invoke('electron:dialog-save', options),

  // App info
  getAppInfo: () => ipcRenderer.invoke('electron:get-app-info'),

  // Navigation events from tray
  onNavigate: (callback: (route: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, route: string) => callback(route);
    ipcRenderer.on('electron:navigate', handler);
    return () => {
      ipcRenderer.removeListener('electron:navigate', handler);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
