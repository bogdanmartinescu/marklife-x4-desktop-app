import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  brandPlistXml,
  ensureBrandedElectronDist,
  replacePlistString,
} from './brand-dev-electron.mjs';

const SAMPLE_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key>
  <string>Electron</string>
  <key>CFBundleName</key>
  <string>Electron</string>
</dict>
</plist>
`;

test('replacePlistString updates an existing key', () => {
  const next = replacePlistString(SAMPLE_PLIST, 'CFBundleName', 'ThermalBridge');
  assert.match(next, /<key>CFBundleName<\/key>\s*<string>ThermalBridge<\/string>/);
  assert.match(next, /<key>CFBundleDisplayName<\/key>\s*<string>Electron<\/string>/);
});

test('brandPlistXml sets both macOS display names', () => {
  const next = brandPlistXml(SAMPLE_PLIST, 'ThermalBridge');
  assert.match(next, /<key>CFBundleName<\/key>\s*<string>ThermalBridge<\/string>/);
  assert.match(next, /<key>CFBundleDisplayName<\/key>\s*<string>ThermalBridge<\/string>/);
});

test('ensureBrandedElectronDist no-ops off macOS', () => {
  assert.equal(ensureBrandedElectronDist({ platform: 'linux' }), null);
});

test('ensureBrandedElectronDist copies and brands a local Electron dist', () => {
  const root = mkdtempSync(join(tmpdir(), 'tb-electron-brand-'));
  const pkgDir = join(root, 'electron');
  const sourceDist = join(pkgDir, 'dist');
  const destination = join(root, 'branded');
  mkdirSync(join(sourceDist, 'Electron.app', 'Contents'), { recursive: true });
  writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ version: '37.0.0' }));
  writeFileSync(join(sourceDist, 'Electron.app', 'Contents', 'Info.plist'), SAMPLE_PLIST);

  const first = ensureBrandedElectronDist({
    platform: 'darwin',
    productName: 'ThermalBridge',
    electronPackageDir: pkgDir,
    sourceDist,
    destination,
  });
  assert.equal(first, destination);
  const branded = readFileSync(join(destination, 'Electron.app', 'Contents', 'Info.plist'), 'utf8');
  assert.match(branded, /<string>ThermalBridge<\/string>/);

  writeFileSync(join(sourceDist, 'Electron.app', 'Contents', 'Info.plist'), SAMPLE_PLIST);
  const second = ensureBrandedElectronDist({
    platform: 'darwin',
    productName: 'ThermalBridge',
    electronPackageDir: pkgDir,
    sourceDist,
    destination,
  });
  assert.equal(second, destination);
  assert.match(
    readFileSync(join(destination, 'Electron.app', 'Contents', 'Info.plist'), 'utf8'),
    /ThermalBridge/,
  );
});
