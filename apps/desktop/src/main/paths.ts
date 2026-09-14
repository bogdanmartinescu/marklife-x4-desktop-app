import { app } from 'electron';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function userDataPath(...parts: string[]): string {
  return join(app.getPath('userData'), ...parts);
}

export function settingsPath(): string {
  return userDataPath('settings.json');
}

export function logsPath(): string {
  return userDataPath('logs', 'thermalbridge.log');
}

export function jobTempDir(): string {
  return userDataPath('jobs');
}

export function libraryDir(): string {
  return userDataPath('library');
}

export function resolvePreloadPath(): string {
  const dir = join(__dirname, '../preload');
  const candidates = [
    join(dir, 'index.cjs'),
    join(dir, 'index.js'),
    join(dir, 'index.mjs'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0] ?? join(dir, 'index.js');
}

export function resolvePrintbridgePath(): string {
  const executable = process.platform === 'win32' ? 'printbridge.exe' : 'printbridge';
  if (app.isPackaged) {
    return join(process.resourcesPath, 'printbridge', executable);
  }

  const candidates = [
    join(process.cwd(), '../../native/printbridge/target/debug', executable),
    join(process.cwd(), 'native/printbridge/target/debug', executable),
    join(app.getAppPath(), '../../native/printbridge/target/debug', executable),
    join(app.getAppPath(), '../../../native/printbridge/target/debug', executable),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0] ?? join(process.cwd(), 'printbridge');
}

export function resolveAppIconPath(): string | undefined {
  const candidates = [
    join(__dirname, '../../resources/icon.png'),
    join(process.cwd(), 'resources/icon.png'),
    join(app.getAppPath(), 'resources/icon.png'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}
