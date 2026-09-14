import { app, BrowserWindow, shell } from 'electron';
import { join } from 'node:path';
import { DEFAULT_MENU_STATE, IpcChannel, MenuCommandSchema } from '@thermalbridge/shared';
import { APP_DISPLAY_NAME, applyAppDisplayName } from './app-name.js';
import { registerIpc } from './ipc/index.js';
import { applyApplicationMenu } from './menu/apply.js';
import { createLogger } from './logger.js';
import { shouldAllowRendererNavigation } from './navigation.js';
import { ignoreClosedPipe, isClosedPipeError, writeLine } from './pipe-errors.js';
import {
  jobTempDir,
  libraryDir,
  logsPath,
  resolveAppIconPath,
  resolvePreloadPath,
  resolvePrintbridgePath,
  settingsPath,
} from './paths.js';
import { LibraryStore } from './library/store.js';
import { BridgeManager } from './printing/bridge-manager.js';
import { SettingsStore } from './settings/store.js';

applyAppDisplayName(app);

const isDev = !app.isPackaged;

ignoreClosedPipe(process.stdout);
ignoreClosedPipe(process.stderr);
process.on('uncaughtException', (error) => {
  if (isClosedPipeError(error)) {
    return;
  }
  writeLine(process.stderr, `Uncaught exception: ${error.stack ?? error.message}\n`);
});

function createWindow(): BrowserWindow {
  const icon = resolveAppIconPath();
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1240,
    minHeight: 720,
    title: APP_DISPLAY_NAME,
    show: false,
    backgroundColor: '#101216',
    autoHideMenuBar: false,
    ...(icon !== undefined ? { icon } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: resolvePreloadPath(),
    },
  });

  window.on('ready-to-show', () => {
    window.show();
  });

  window.webContents.on('did-fail-load', (_event, code, description, url) => {
    process.stderr.write(`Renderer failed to load (${code}) ${description} ${url}\n`);
    window.show();
  });

  window.webContents.on('preload-error', (_event, path, error) => {
    process.stderr.write(`Preload failed (${path}): ${error.message}\n`);
  });

  window.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (!shouldAllowRendererNavigation(url, process.env['ELECTRON_RENDERER_URL'])) {
      event.preventDefault();
    }
  });

  if (isDev) {
    window.webContents.openDevTools({ mode: 'detach' });
  }

  const rendererUrl = process.env['ELECTRON_RENDERER_URL'];
  if (isDev && rendererUrl) {
    void window.loadURL(rendererUrl);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return window;
}

app.whenReady().then(() => {
  const logger = createLogger('main', logsPath());
  const settings = new SettingsStore(settingsPath());
  const localDir = libraryDir();
  const syncFolder = settings.get().syncFolderPath;
  const sharedDir = syncFolder ?? localDir;
  const storeRef: { current: LibraryStore } = {
    current: new LibraryStore({ localDir, sharedDir }),
  };
  const bridge = new BridgeManager(resolvePrintbridgePath(), jobTempDir(), logger);
  bridge.start();

  registerIpc({
    bridge,
    settings,
    storeRef,
    localDir,
    logger,
    appVersion: app.getVersion(),
  });

  applyApplicationMenu({
    state: {
      ...DEFAULT_MENU_STATE,
      locale: settings.get().locale,
    },
    isDev,
    sendCommand: (command) => {
      const parsed = MenuCommandSchema.parse(command);
      const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
      window?.webContents.send(IpcChannel.MENU_COMMAND, parsed);
    },
  });

  const dockIcon = resolveAppIconPath();
  if (process.platform === 'darwin' && dockIcon !== undefined) {
    app.dock?.setIcon(dockIcon);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('before-quit', () => {
    bridge.stop();
  });
}).catch((error: unknown) => {
  process.stderr.write(`ThermalBridge failed to start: ${String(error)}\n`);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
