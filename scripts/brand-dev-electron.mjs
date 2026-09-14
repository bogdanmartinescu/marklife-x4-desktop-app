import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const desktopRoot = join(root, 'apps', 'desktop');
export const BRANDED_DIST_DIR = join(desktopRoot, '.electron-dev-dist');
const STAMP_NAME = '.thermalbridge-brand';

export function replacePlistString(xml, key, value) {
  const pattern = new RegExp(`(<key>${key}</key>\\s*<string>)([^<]*)(</string>)`);
  if (pattern.test(xml)) {
    return xml.replace(pattern, `$1${value}$3`);
  }
  return xml.replace('</dict>', `  <key>${key}</key>\n  <string>${value}</string>\n</dict>`);
}

export function brandPlistXml(xml, name) {
  return replacePlistString(replacePlistString(xml, 'CFBundleName', name), 'CFBundleDisplayName', name);
}

export function readProductName(packageJsonPath = join(desktopRoot, 'package.json')) {
  const manifest = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  if (typeof manifest.productName !== 'string' || manifest.productName.length === 0) {
    throw new Error(`Missing productName in ${packageJsonPath}`);
  }
  return manifest.productName;
}

function electronPackageDir() {
  const require = createRequire(join(desktopRoot, 'package.json'));
  return dirname(require.resolve('electron/package.json'));
}

function stampContents(electronVersion, productName) {
  return `${electronVersion}\n${productName}\n`;
}

function copyElectronDist(source, destination) {
  rmSync(destination, { recursive: true, force: true });
  mkdirSync(dirname(destination), { recursive: true });
  const cloned = spawnSync('cp', ['-cR', source, destination], { stdio: 'ignore' });
  if (cloned.status !== 0) {
    cpSync(source, destination, { recursive: true });
  }
}

export function ensureBrandedElectronDist(options = {}) {
  const platform = options.platform ?? process.platform;
  if (platform !== 'darwin') {
    return null;
  }
  const productName = options.productName ?? readProductName();
  const pkgDir = options.electronPackageDir ?? electronPackageDir();
  const sourceDist = options.sourceDist ?? join(pkgDir, 'dist');
  const destination = options.destination ?? BRANDED_DIST_DIR;
  const electronVersion = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')).version;
  const stampPath = join(destination, STAMP_NAME);
  const expected = stampContents(electronVersion, productName);
  const appPlist = join(destination, 'Electron.app', 'Contents', 'Info.plist');
  if (existsSync(stampPath) && existsSync(appPlist) && readFileSync(stampPath, 'utf8') === expected) {
    return destination;
  }
  if (!existsSync(sourceDist)) {
    throw new Error(`Electron dist not found at ${sourceDist}`);
  }
  copyElectronDist(sourceDist, destination);
  writeFileSync(appPlist, brandPlistXml(readFileSync(appPlist, 'utf8'), productName));
  writeFileSync(stampPath, expected);
  return destination;
}

function runCommand(command, env) {
  const child = spawn(command[0], command.slice(1), {
    stdio: 'inherit',
    env,
    cwd: process.cwd(),
  });
  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

function isMain() {
  const entry = process.argv[1];
  return entry !== undefined && import.meta.url === pathToFileURL(entry).href;
}

if (isMain()) {
  const branded = ensureBrandedElectronDist();
  const env = { ...process.env };
  if (branded) {
    env.ELECTRON_OVERRIDE_DIST_PATH = branded;
  }
  const command = process.argv.slice(2);
  if (command.length > 0) {
    runCommand(command, env);
  }
}
