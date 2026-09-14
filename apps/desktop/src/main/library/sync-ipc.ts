/**
 * IPC handlers for the shared-folder sync feature.
 *
 * Channels (invoke unless noted):
 *   sync:status        → SyncStatus
 *   sync:chooseFolder  → SyncStatus   (opens native folder dialog)
 *   sync:disconnect    → SyncStatus
 *   library:changed    → push (main → renderer, no invoke)
 *
 * Paths stay in main. The renderer only receives the structured SyncStatus.
 */

import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { existsSync, mkdirSync, readdirSync, unlinkSync, watch, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { SyncStatus } from '@thermalbridge/shared';
import { IpcChannel } from '@thermalbridge/shared';
import type { SettingsStore } from '../settings/store.js';
import { LibraryStore } from './store.js';
import {
  atomicWriteJson,
  isDropboxConflictName,
  mergeIntoFolder,
  suggestDropboxRoot,
  writeSyncMarker,
} from './sync-folder.js';

type Platform = 'darwin' | 'win32' | 'linux';
type FsWatcher = ReturnType<typeof watch>;

// ─── watcher ──────────────────────────────────────────────────────────────────

let activeWatcher: FsWatcher | null = null;

function startWatch(sharedDir: string): void {
  stopWatch();
  try {
    activeWatcher = watch(sharedDir, { persistent: false }, (_event, filename) => {
      if (filename === null) {
        return;
      }
      const isManifest = filename === 'media.json' || filename === 'templates.json';
      if (!isManifest || isDropboxConflictName(filename)) {
        return;
      }
      broadcastLibraryChanged();
    });
  } catch {
    // fs.watch is best-effort; sync works, just no push updates.
  }
}

function stopWatch(): void {
  if (activeWatcher !== null) {
    try {
      activeWatcher.close();
    } catch {
      // ignore
    }
    activeWatcher = null;
  }
}

export function broadcastLibraryChanged(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IpcChannel.LIBRARY_CHANGED);
  }
}

// ─── status ───────────────────────────────────────────────────────────────────

function conflictedFiles(dir: string): boolean {
  try {
    return readdirSync(dir).some(isDropboxConflictName);
  } catch {
    return false;
  }
}

function buildStatus(settings: SettingsStore): SyncStatus {
  const folderPath = settings.get().syncFolderPath ?? null;
  const dropboxSuggested = suggestDropboxRoot(homedir(), process.platform as Platform);
  const conflicted = folderPath !== null ? conflictedFiles(folderPath) : false;
  return { folderPath, dropboxSuggested, conflicted };
}

// ─── validation ───────────────────────────────────────────────────────────────

function validateFolderPath(folderPath: string): string | null {
  const appBundlePath = app.getAppPath();
  const userData = app.getPath('userData');

  if (folderPath.startsWith(appBundlePath)) {
    return 'The selected folder is inside the application bundle.';
  }
  if (folderPath === userData || userData.startsWith(`${folderPath}/`)) {
    return 'The selected folder is or contains the application data directory.';
  }

  try {
    mkdirSync(folderPath, { recursive: true });
    const probe = join(folderPath, '.thermalbridge-probe');
    writeFileSync(probe, '');
    unlinkSync(probe);
  } catch {
    return 'The selected folder is not writable.';
  }

  return null;
}

// ─── enable / disable ─────────────────────────────────────────────────────────

function enableSync(newFolderPath: string, localDir: string, settings: SettingsStore): LibraryStore {
  writeSyncMarker(newFolderPath);

  const merged = mergeIntoFolder({ sourceDir: localDir, destDir: newFolderPath });
  atomicWriteJson(join(newFolderPath, 'media.json'), { items: merged.media });
  atomicWriteJson(join(newFolderPath, 'templates.json'), { items: merged.templates });

  settings.update({ syncFolderPath: newFolderPath });
  startWatch(newFolderPath);

  return new LibraryStore({ localDir, sharedDir: newFolderPath });
}

function disableSync(currentSharedDir: string, localDir: string, settings: SettingsStore): LibraryStore {
  stopWatch();

  const merged = mergeIntoFolder({ sourceDir: currentSharedDir, destDir: localDir });
  atomicWriteJson(join(localDir, 'media.json'), { items: merged.media });
  atomicWriteJson(join(localDir, 'templates.json'), { items: merged.templates });

  settings.update({ syncFolderPath: undefined });

  return new LibraryStore({ localDir, sharedDir: localDir });
}

// ─── registration ─────────────────────────────────────────────────────────────

export interface RegisterSyncIpcOptions {
  settings: SettingsStore;
  localDir: string;
  /**
   * Mutable ref for the library store. Handlers in ipc/index.ts read
   * `storeRef.current` so they automatically see the new instance after
   * sync is enabled or disabled.
   */
  storeRef: { current: LibraryStore };
}

export function registerSyncIpc(options: RegisterSyncIpcOptions): void {
  const { settings, localDir, storeRef } = options;

  // Restore watcher from persisted settings on startup.
  const existing = settings.get().syncFolderPath;
  if (existing !== undefined && existsSync(existing)) {
    startWatch(existing);
  }

  // Broadcast on window focus so changes from other machines are picked up.
  app.on('browser-window-focus', () => {
    broadcastLibraryChanged();
  });

  ipcMain.handle(IpcChannel.SYNC_STATUS, (): SyncStatus => {
    return buildStatus(settings);
  });

  ipcMain.handle(IpcChannel.SYNC_CHOOSE_FOLDER, async (event): Promise<SyncStatus> => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const suggested = suggestDropboxRoot(homedir(), process.platform as Platform);
    const defaultPath = suggested !== null ? join(suggested, 'ThermalBridge') : undefined;
    const dialogOptions = {
      title: 'Choose a shared folder',
      properties: ['openDirectory', 'createDirectory'] as Array<'openDirectory' | 'createDirectory'>,
      ...(defaultPath !== undefined ? { defaultPath } : {}),
    };

    const result = win
      ? await dialog.showOpenDialog(win, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (result.canceled || result.filePaths.length === 0) {
      return buildStatus(settings);
    }

    const chosen = result.filePaths[0];
    if (chosen === undefined) {
      return buildStatus(settings);
    }

    const err = validateFolderPath(chosen);
    if (err !== null) {
      // Return unchanged status; renderer can show a message if folderPath is still null.
      return buildStatus(settings);
    }

    storeRef.current = enableSync(chosen, localDir, settings);
    broadcastLibraryChanged();
    return buildStatus(settings);
  });

  ipcMain.handle(IpcChannel.SYNC_DISCONNECT, (): SyncStatus => {
    const current = settings.get().syncFolderPath;
    if (current !== undefined) {
      storeRef.current = disableSync(current, localDir, settings);
      broadcastLibraryChanged();
    }
    return buildStatus(settings);
  });
}

// Register a one-shot on handler for opening the folder via shell.openPath.
// This is called directly from the renderer via ipcRenderer.send.
export function registerOpenSyncFolderHandler(): void {
  ipcMain.on(IpcChannel.SYNC_OPEN_FOLDER, (_event, folderPath: unknown) => {
    if (typeof folderPath === 'string' && folderPath.length > 0) {
      void shell.openPath(folderPath);
    }
  });
}
