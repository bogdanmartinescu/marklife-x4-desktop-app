import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { LabelTemplateMeta, MediaFileMeta } from '@thermalbridge/shared';
import {
  atomicWriteJson,
  detectDropboxRoots,
  isDropboxConflictName,
  mergeIntoFolder,
  readSyncMarker,
  suggestDropboxRoot,
  writeSyncMarker,
} from './sync-folder.js';

// ─── atomicWriteJson ──────────────────────────────────────────────────────────

describe('atomicWriteJson', () => {
  it('writes valid JSON to the destination path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tb-sync-'));
    const dest = join(dir, 'test.json');
    atomicWriteJson(dest, { hello: 'world' });
    const parsed: unknown = JSON.parse(readFileSync(dest, 'utf8'));
    expect(parsed).toEqual({ hello: 'world' });
  });

  it('replaces an existing file atomically (no tmp left behind)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tb-sync-'));
    const dest = join(dir, 'test.json');
    atomicWriteJson(dest, { v: 1 });
    atomicWriteJson(dest, { v: 2 });
    const parsed: unknown = JSON.parse(readFileSync(dest, 'utf8'));
    expect((parsed as { v: number }).v).toBe(2);
    const files = readdirSync(dir);
    expect(files.some((f) => f.endsWith('.tmp'))).toBe(false);
  });
});

// ─── isDropboxConflictName ────────────────────────────────────────────────────

describe('isDropboxConflictName', () => {
  it('recognises Dropbox conflict filenames', () => {
    expect(isDropboxConflictName("media (Bogdan's conflicted copy 2024-01-01).json")).toBe(true);
    expect(isDropboxConflictName("templates (laptop conflicted copy 2025-12-31).json")).toBe(true);
  });

  it('accepts normal filenames', () => {
    expect(isDropboxConflictName('media.json')).toBe(false);
    expect(isDropboxConflictName('templates.json')).toBe(false);
  });
});

// ─── detectDropboxRoots ───────────────────────────────────────────────────────

describe('detectDropboxRoots', () => {
  it('returns only paths that exist', () => {
    const root = mkdtempSync(join(tmpdir(), 'tb-home-'));
    const dropboxPath = join(root, 'Dropbox');
    mkdirSync(dropboxPath);

    const result = detectDropboxRoots(root, 'darwin', (p) => p === dropboxPath);
    expect(result).toContain(dropboxPath);
    expect(result.every((p) => p === dropboxPath)).toBe(true);
  });

  it('returns nothing when no Dropbox folder exists', () => {
    const root = mkdtempSync(join(tmpdir(), 'tb-home-'));
    const result = detectDropboxRoots(root, 'darwin', () => false);
    expect(result).toHaveLength(0);
  });

  it('detects macOS CloudStorage Dropbox', () => {
    const root = mkdtempSync(join(tmpdir(), 'tb-home-'));
    const cloud = join(root, 'Library', 'CloudStorage');
    const cloudDropbox = join(cloud, 'Dropbox');
    const exists = (p: string): boolean => p === cloud || p === cloudDropbox;
    const result = detectDropboxRoots(root, 'darwin', exists);
    expect(result).toContain(cloudDropbox);
  });

  it('builds Win32 candidates from home', () => {
    const root = mkdtempSync(join(tmpdir(), 'tb-home-'));
    const winDropbox = join(root, 'Dropbox');
    const exists = (p: string): boolean => p === winDropbox;
    const result = detectDropboxRoots(root, 'win32', exists);
    expect(result).toContain(winDropbox);
  });
});

describe('suggestDropboxRoot', () => {
  it('returns first existing root', () => {
    const root = mkdtempSync(join(tmpdir(), 'tb-home-'));
    const dropboxPath = join(root, 'Dropbox');
    mkdirSync(dropboxPath);
    const result = suggestDropboxRoot(root, 'darwin', (p) => p === dropboxPath);
    expect(result).toBe(dropboxPath);
  });

  it('returns null when nothing found', () => {
    const root = mkdtempSync(join(tmpdir(), 'tb-home-'));
    expect(suggestDropboxRoot(root, 'linux', () => false)).toBeNull();
  });
});

// ─── readSyncMarker / writeSyncMarker ─────────────────────────────────────────

describe('readSyncMarker / writeSyncMarker', () => {
  it('writes then reads the marker', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tb-sync-'));
    writeSyncMarker(dir);
    const marker = readSyncMarker(dir);
    expect(marker).toEqual({ schemaVersion: 1, kind: 'thermalbridge-library' });
  });

  it('returns null when marker is absent', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tb-sync-'));
    expect(readSyncMarker(dir)).toBeNull();
  });

  it('returns null when marker JSON is corrupt', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tb-sync-'));
    writeFileSync(join(dir, 'thermalbridge-library.json'), 'not json', 'utf8');
    expect(readSyncMarker(dir)).toBeNull();
  });
});

// ─── mergeIntoFolder ──────────────────────────────────────────────────────────

let _counter = 0;
function hex64(seed: string): string {
  return seed.padEnd(64, '0').slice(0, 64);
}
function makeMedia(overrides: Partial<MediaFileMeta> = {}): MediaFileMeta {
  const n = String(++_counter).padStart(12, '0');
  return {
    id: `med-00000000-0000-0000-0000-${n}`,
    name: 'test.png',
    mimeType: 'image/png',
    byteLength: 8,
    sha256: hex64(`sha256hash${n}`),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeTpl(overrides: Partial<LabelTemplateMeta> = {}): LabelTemplateMeta {
  return {
    id: `tpl-00000000-0000-0000-0000-${String(Math.random()).slice(2).padEnd(12, '0')}`,
    name: 'Test',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    widthMm: 100,
    heightMm: 150,
    pageCount: 1,
    ...overrides,
  };
}

function writeManifest(dir: string, name: string, items: unknown[]): void {
  writeFileSync(join(dir, name), JSON.stringify({ items }, null, 2), 'utf8');
}

function writeFile(dir: string, sub: string, name: string, content = 'bytes'): void {
  mkdirSync(join(dir, sub), { recursive: true });
  writeFileSync(join(dir, sub, name), content, 'utf8');
}

describe('mergeIntoFolder', () => {
  it('copies media not present in dest (by sha256)', () => {
    const src = mkdtempSync(join(tmpdir(), 'tb-src-'));
    const dest = mkdtempSync(join(tmpdir(), 'tb-dest-'));
    const m1 = makeMedia();
    writeManifest(src, 'media.json', [m1]);
    writeFile(src, 'media', `${m1.id}.bin`);

    const result = mergeIntoFolder({ sourceDir: src, destDir: dest });
    expect(result.media).toHaveLength(1);
    expect(result.media[0]?.sha256).toBe(m1.sha256);
  });

  it('deduplicates media by sha256 (same hash not copied twice)', () => {
    const src = mkdtempSync(join(tmpdir(), 'tb-src-'));
    const dest = mkdtempSync(join(tmpdir(), 'tb-dest-'));
    const m = makeMedia();
    const destCopy = { ...m, id: `med-00000000-0000-0000-0000-111111111111` };
    writeManifest(src, 'media.json', [m]);
    writeManifest(dest, 'media.json', [destCopy]);
    writeFile(src, 'media', `${m.id}.bin`);
    writeFile(dest, 'media', `${destCopy.id}.bin`);

    const result = mergeIntoFolder({ sourceDir: src, destDir: dest });
    expect(result.media).toHaveLength(1); // only dest copy, src skipped
  });

  it('copies template when dest has no version', () => {
    const src = mkdtempSync(join(tmpdir(), 'tb-src-'));
    const dest = mkdtempSync(join(tmpdir(), 'tb-dest-'));
    const t = makeTpl({ id: 'tpl-00000000-0000-0000-0000-aaaaaaaaaaaa' });
    writeManifest(src, 'templates.json', [t]);
    writeFile(src, 'templates', `${t.id}.json`, JSON.stringify({ id: t.id, pages: [] }));

    const result = mergeIntoFolder({ sourceDir: src, destDir: dest });
    expect(result.templates).toHaveLength(1);
  });

  it('keeps dest template when it is newer', () => {
    const src = mkdtempSync(join(tmpdir(), 'tb-src-'));
    const dest = mkdtempSync(join(tmpdir(), 'tb-dest-'));
    const id = 'tpl-00000000-0000-0000-0000-bbbbbbbbbbbb';
    const srcTpl = makeTpl({ id, updatedAt: '2024-01-01T00:00:00.000Z' });
    const destTpl = makeTpl({ id, updatedAt: '2024-06-01T00:00:00.000Z' });
    writeManifest(src, 'templates.json', [srcTpl]);
    writeManifest(dest, 'templates.json', [destTpl]);
    writeFile(src, 'templates', `${id}.json`);
    writeFile(dest, 'templates', `${id}.json`);

    const result = mergeIntoFolder({ sourceDir: src, destDir: dest });
    const kept = result.templates.find((t) => t.id === id);
    expect(kept?.updatedAt).toBe('2024-06-01T00:00:00.000Z');
  });

  it('copies source template when it is newer', () => {
    const src = mkdtempSync(join(tmpdir(), 'tb-src-'));
    const dest = mkdtempSync(join(tmpdir(), 'tb-dest-'));
    const id = 'tpl-00000000-0000-0000-0000-cccccccccccc';
    const srcTpl = makeTpl({ id, updatedAt: '2025-01-01T00:00:00.000Z' });
    const destTpl = makeTpl({ id, updatedAt: '2024-01-01T00:00:00.000Z' });
    writeManifest(src, 'templates.json', [srcTpl]);
    writeManifest(dest, 'templates.json', [destTpl]);
    writeFile(src, 'templates', `${id}.json`);
    writeFile(dest, 'templates', `${id}.json`);

    const result = mergeIntoFolder({ sourceDir: src, destDir: dest });
    const kept = result.templates.find((t) => t.id === id);
    expect(kept?.updatedAt).toBe('2025-01-01T00:00:00.000Z');
  });
});
