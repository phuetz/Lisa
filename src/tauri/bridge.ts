/**
 * Tauri Bridge — Replaces Electron's preload/contextBridge
 *
 * Provides the same interface as the old ElectronAPI but backed by
 * Tauri v2 commands and plugins. Falls back gracefully in browser mode.
 */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

// ---------------------------------------------------------------------------
// Types (same as old electron/types.ts)
// ---------------------------------------------------------------------------

export interface AppInfo {
  version: string;
  name: string;
  platform: string;
  arch: string;
  userDataPath: string;
  appPath: string;
}

export interface TauriAPI {
  // Window control
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: () => Promise<boolean>;

  // Notifications
  notify: (title: string, body: string) => Promise<void>;

  // File system
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, data: string) => Promise<void>;
  readBinaryFile: (filePath: string) => Promise<Uint8Array>;
  writeBinaryFile: (filePath: string, data: Uint8Array) => Promise<void>;

  // Dialogs
  showOpenDialog: (options: {
    title?: string;
    filters?: { name: string; extensions: string[] }[];
    multiple?: boolean;
    directory?: boolean;
  }) => Promise<string[] | null>;
  showSaveDialog: (options: {
    title?: string;
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
  }) => Promise<string | null>;

  // App info
  getAppInfo: () => Promise<AppInfo>;

  // Navigation events from tray
  onNavigate: (callback: (route: string) => void) => () => void;
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/** Check if running inside Tauri */
export function isRunningInTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** @deprecated Use isRunningInTauri() — kept for backward compat */
export function isRunningInElectron(): boolean {
  return false;
}

/** Check if running as desktop app (Tauri) */
export function isDesktopApp(): boolean {
  return isRunningInTauri();
}

// ---------------------------------------------------------------------------
// Lazy-loaded plugins (tree-shaken in browser mode)
// ---------------------------------------------------------------------------

async function getNotificationPlugin() {
  const { sendNotification } = await import('@tauri-apps/plugin-notification');
  return { sendNotification };
}

async function getFsPlugin() {
  const { readTextFile, writeTextFile, readFile: readBin, writeFile: writeBin } =
    await import('@tauri-apps/plugin-fs');
  return { readTextFile, writeTextFile, readBin, writeBin };
}

async function getDialogPlugin() {
  const { open, save } = await import('@tauri-apps/plugin-dialog');
  return { open, save };
}

// ---------------------------------------------------------------------------
// Tauri API implementation
// ---------------------------------------------------------------------------

function createTauriAPI(): TauriAPI {
  return {
    minimize: () => invoke('minimize_window'),
    maximize: () => invoke('maximize_window'),
    close: () => invoke('close_window'),
    isMaximized: () => invoke<boolean>('is_maximized'),

    notify: async (title: string, body: string) => {
      const { sendNotification } = await getNotificationPlugin();
      sendNotification({ title, body });
    },

    readFile: async (filePath: string) => {
      const { readTextFile } = await getFsPlugin();
      return readTextFile(filePath);
    },
    writeFile: async (filePath: string, data: string) => {
      const { writeTextFile } = await getFsPlugin();
      await writeTextFile(filePath, data);
    },
    readBinaryFile: async (filePath: string) => {
      const { readBin } = await getFsPlugin();
      return new Uint8Array(await readBin(filePath));
    },
    writeBinaryFile: async (filePath: string, data: Uint8Array) => {
      const { writeBin } = await getFsPlugin();
      await writeBin(filePath, data);
    },

    showOpenDialog: async (options) => {
      const { open } = await getDialogPlugin();
      const result = await open({
        title: options.title,
        multiple: options.multiple ?? false,
        directory: options.directory ?? false,
        filters: options.filters?.map(f => ({
          name: f.name,
          extensions: f.extensions,
        })),
      });
      if (result === null) return null;
      return Array.isArray(result) ? result : [result];
    },

    showSaveDialog: async (options) => {
      const { save } = await getDialogPlugin();
      return save({
        title: options.title,
        defaultPath: options.defaultPath,
        filters: options.filters?.map(f => ({
          name: f.name,
          extensions: f.extensions,
        })),
      });
    },

    getAppInfo: async () => {
      const info = await invoke<{
        version: string;
        name: string;
        platform: string;
        arch: string;
        user_data_path: string;
        app_path: string;
      }>('get_app_info');
      return {
        version: info.version,
        name: info.name,
        platform: info.platform,
        arch: info.arch,
        userDataPath: info.user_data_path,
        appPath: info.app_path,
      };
    },

    onNavigate: (callback: (route: string) => void) => {
      let unlisten: (() => void) | null = null;
      listen<string>('navigate', (event) => {
        callback(event.payload);
      }).then((fn) => {
        unlisten = fn;
      });
      return () => {
        unlisten?.();
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _tauriAPI: TauriAPI | null = null;

/** Get the Tauri API bridge (only works inside Tauri) */
export function getTauriAPI(): TauriAPI | null {
  if (!isRunningInTauri()) return null;
  if (!_tauriAPI) {
    _tauriAPI = createTauriAPI();
  }
  return _tauriAPI;
}

// ---------------------------------------------------------------------------
// Global type declaration (replaces window.electronAPI)
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    /** @deprecated Use getTauriAPI() from '@/tauri/bridge' */
    electronAPI?: undefined;
  }
}
