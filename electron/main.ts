import {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  Notification,
  desktopCapturer,
  dialog,
  session,
  nativeImage,
} from 'electron';
import { join } from 'path';
import { readFile, writeFile } from 'fs/promises';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// ---------------------------------------------------------------------------
// Embedded API server
// ---------------------------------------------------------------------------
async function startApiServer() {
  try {
    // Dynamic import to avoid bundling issues — the API server uses CommonJS deps
    const { createServer } = await import('../src/api/server.js');
    const server = createServer();
    const port = process.env.LISA_API_PORT || 3001;
    server.listen(port, () => {
      console.log(`[Electron] API server listening on http://localhost:${port}`);
    });
  } catch (err) {
    console.error('[Electron] Failed to start API server:', err);
  }
}

// ---------------------------------------------------------------------------
// Window creation
// ---------------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Lisa AI',
    icon: join(__dirname, '../../public/icon-192x192.svg'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      // In development, electron-vite may output as index.js — try both

      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // needed for preload fs access
    },
  });

  // Dev: load Vite dev server — Prod: load built file
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Open DevTools in dev
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('close', (e) => {
    // Minimize to tray instead of closing
    if (tray && !app.isQuiting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// System tray
// ---------------------------------------------------------------------------
function createTray() {
  const iconPath = join(__dirname, '../../public/icon-192x192.svg');
  // nativeImage can load SVG on some platforms; fall back to a 16x16 empty image
  let trayIcon: Electron.NativeImage;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      trayIcon = nativeImage.createEmpty();
    }
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('Lisa AI');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Ouvrir Lisa',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Chat',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
        mainWindow?.webContents.send('electron:navigate', '/chat');
      },
    },
    {
      label: 'Dashboard',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
        mainWindow?.webContents.send('electron:navigate', '/dashboard');
      },
    },
    {
      label: 'Agents',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
        mainWindow?.webContents.send('electron:navigate', '/agents');
      },
    },
    { type: 'separator' },
    {
      label: 'Quitter',
      click: () => {
        (app as typeof app & { isQuiting: boolean }).isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

// ---------------------------------------------------------------------------
// CSP for Electron
// ---------------------------------------------------------------------------
function setupCSP() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' https: http://localhost:*; " +
            "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net; " +
            "worker-src 'self' blob: https://cdn.jsdelivr.net; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
            "font-src 'self' https://fonts.gstatic.com data:; " +
            "img-src 'self' data: blob: https:; " +
            "connect-src 'self' data: ws://localhost:* wss://localhost:* http://localhost:* https: blob:; " +
            "media-src 'self' blob: mediastream:",
        ],
      },
    });
  });
}

// ---------------------------------------------------------------------------
// IPC Handlers
// ---------------------------------------------------------------------------
function setupIPC() {
  // Window control
  ipcMain.on('electron:minimize', () => mainWindow?.minimize());
  ipcMain.on('electron:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('electron:close', () => mainWindow?.close());
  ipcMain.handle('electron:is-maximized', () => mainWindow?.isMaximized() ?? false);

  // Notifications
  ipcMain.on('electron:notify', (_event, title: string, body: string) => {
    new Notification({ title, body }).show();
  });

  // Screen capture
  ipcMain.handle('electron:screen-capture', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 240 },
    });
    return sources.map((s) => ({
      id: s.id,
      name: s.name,
      thumbnailDataUrl: s.thumbnail.toDataURL(),
    }));
  });

  // File system — text
  ipcMain.handle('electron:fs-read', async (_event, filePath: string) => {
    return readFile(filePath, 'utf-8');
  });
  ipcMain.handle('electron:fs-write', async (_event, filePath: string, data: string) => {
    await writeFile(filePath, data, 'utf-8');
  });

  // File system — binary
  ipcMain.handle('electron:fs-read-binary', async (_event, filePath: string) => {
    const buf = await readFile(filePath);
    return new Uint8Array(buf);
  });
  ipcMain.handle('electron:fs-write-binary', async (_event, filePath: string, data: Uint8Array) => {
    await writeFile(filePath, Buffer.from(data));
  });

  // Dialogs
  ipcMain.handle('electron:dialog-open', async (_event, options: Electron.OpenDialogOptions) => {
    const result = await dialog.showOpenDialog(mainWindow!, options);
    return result.canceled ? undefined : result.filePaths;
  });
  ipcMain.handle('electron:dialog-save', async (_event, options: Electron.SaveDialogOptions) => {
    const result = await dialog.showSaveDialog(mainWindow!, options);
    return result.canceled ? undefined : result.filePath;
  });

  // App info
  ipcMain.handle('electron:get-app-info', () => ({
    version: app.getVersion(),
    name: app.getName(),
    platform: process.platform,
    arch: process.arch,
    userDataPath: app.getPath('userData'),
    appPath: app.getAppPath(),
  }));
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
app.whenReady().then(async () => {
  setupCSP();
  setupIPC();
  createWindow();
  createTray();
  await startApiServer();

  app.on('activate', () => {
    // macOS: re-create window when dock icon clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  (app as typeof app & { isQuiting: boolean }).isQuiting = true;
});
