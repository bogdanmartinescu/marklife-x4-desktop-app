/**
 * Sync-folder helpers for the Dropbox/shared-folder feature.
 *
 * The app treats a folder that Dropbox (or any other sync client) already keeps
 * in sync as the authoritative home for media and templates. No Dropbox SDK or
 * OAuth is involved — the folder behaves like any local directory.
 *
 * Responsibilities of this module:
 * - Detect plausible Dropbox root directories on each OS.
 * - Write JSON manifests atomically (write to *.tmp then rename).
 * - Merge a local library snapshot into a shared folder when sync is enabled or
 *   disabled, and vice-versa.
 *
 * Nothing in here depends on Electron or Node's `fs` being called from the main
 * process; all functions accept injected filesystem operations for unit testing.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ZodType } from 'zod';
import {
  LabelTemplateMetaSchema,
  LabelTemplateSchema,
  MediaFileMetaSchema,
  type LabelTemplate,
  type LabelTemplateMeta,
  type MediaFileMeta,
} from '@thermalbridge/shared';

// ─── marker file ─────────────────────────────────────────────────────────────

export const SYNC_MARKER_NAME = 'thermalbridge-library.json';

export interface SyncMarker {
  schemaVersion: 1;
  kind: 'thermalbridge-library';
}

export function readSyncMarker(
  folderPath: string,
  readFileFn: (p: string) => string = (p) => readFileSync(p, 'utf8'),
  existsFn: (p: string) => boolean = existsSync,
): SyncMarker | null {
  const markerPath = join(folderPath, SYNC_MARKER_NAME);
  if (!existsFn(markerPath)) {
    return null;
  }
  try {
    const raw: unknown = JSON.parse(readFileFn(markerPath));
    if (
      typeof raw === 'object' &&
      raw !== null &&
      (raw as Record<string, unknown>)['kind'] === 'thermalbridge-library'
    ) {
      return { schemaVersion: 1, kind: 'thermalbridge-library' };
    }
  } catch {
    // treat corrupt marker as absent
  }
  return null;
}

export function writeSyncMarker(
  folderPath: string,
  mkdirFn: (p: string, opts: { recursive: boolean }) => void = (p, opts) =>
    mkdirSync(p, opts),
): void {
  mkdirFn(folderPath, { recursive: true });
  atomicWriteJson(join(folderPath, SYNC_MARKER_NAME), {
    schemaVersion: 1,
    kind: 'thermalbridge-library',
  });
}

// ─── atomic JSON write ───────────────────────────────────────────────────────

/**
 * Writes JSON to `destPath` via a temp file + rename so Dropbox cannot observe
 * a half-written manifest.
 */
export function atomicWriteJson(destPath: string, value: unknown): void {
  const tmpPath = `${destPath}.tmp`;
  writeFileSync(tmpPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  renameSync(tmpPath, destPath);
}

/**
 * Returns true when a filename looks like a Dropbox conflict artefact
 * (e.g. "media (Laptop's conflicted copy 2024-01-01).json").
 */
export function isDropboxConflictName(name: string): boolean {
  return /\(.*conflicted copy.*\)/i.test(name);
}

// ─── Dropbox root detection ──────────────────────────────────────────────────

export type Platform = 'darwin' | 'win32' | 'linux';

/**
 * Returns candidate Dropbox root directories for the current platform.
 * `home` is `os.homedir()` in production; inject a temp dir in tests.
 * `existsFn` defaults to `fs.existsSync`; override in tests.
 */
export function detectDropboxRoots(
  home: string,
  platform: Platform,
  existsFn: (p: string) => boolean = existsSync,
): string[] {
  const candidates: string[] = [];

  if (platform === 'darwin') {
    candidates.push(
      join(home, 'Dropbox'),
      join(home, 'Dropbox (Personal)'),
      join(home, 'Dropbox (Business)'),
    );
    // Dropbox via macOS CloudStorage (newer installs)
    const cloudStorage = join(home, 'Library', 'CloudStorage');
    if (existsFn(cloudStorage)) {
      // Any subdirectory starting with "Dropbox" inside CloudStorage
      candidates.push(join(cloudStorage, 'Dropbox'));
      candidates.push(join(cloudStorage, 'Dropbox-Personal'));
    }
  } else if (platform === 'win32') {
    const userProfile = process.env['USERPROFILE'] ?? home;
    candidates.push(
      join(userProfile, 'Dropbox'),
      join(userProfile, 'Dropbox (Personal)'),
      join(userProfile, 'Dropbox (Business)'),
    );
  } else {
    // Linux
    candidates.push(join(home, 'Dropbox'), join(home, 'Dropbox (Personal)'));
  }

  return candidates.filter(existsFn);
}

/**
 * Returns the first plausible Dropbox root, or null if none found.
 */
export function suggestDropboxRoot(
  home: string,
  platform: Platform,
  existsFn: (p: string) => boolean = existsSync,
): string | null {
  const roots = detectDropboxRoots(home, platform, existsFn);
  return roots[0] ?? null;
}

// ─── manifest helpers ────────────────────────────────────────────────────────

function readManifestItems<T>(path: string, schema: ZodType<T>): T[] {
  try {
    const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (
      typeof raw !== 'object' ||
      raw === null ||
      !('items' in raw) ||
      !Array.isArray((raw as { items: unknown }).items)
    ) {
      return [];
    }
    return (raw as { items: unknown[] }).items.flatMap((item) => {
      const parsed = schema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

// ─── merge logic ─────────────────────────────────────────────────────────────

export interface MergeResult {
  media: MediaFileMeta[];
  templates: LabelTemplateMeta[];
}

/**
 * Merge local media + templates into a shared folder (used when enabling sync).
 * Also works in reverse (shared → local) when disconnecting.
 *
 * Rules:
 * - Media: deduplicated by sha256. Local item wins if sha256 not in dest.
 * - Templates: deduplicated by id. Newer `updatedAt` wins.
 *
 * Files are copied from `sourceDir` to `destDir` as needed. No deletions.
 */
export function mergeIntoFolder(options: {
  sourceDir: string;
  destDir: string;
  existsFn?: (p: string) => boolean;
  copyFileFn?: (src: string, dest: string) => void;
  mkdirFn?: (p: string, opts: { recursive: boolean }) => void;
}): MergeResult {
  const existsFn = options.existsFn ?? existsSync;
  const copyFileFn = options.copyFileFn ?? copyFileSync;
  const mkdirFn = options.mkdirFn ?? ((p, opts) => mkdirSync(p, opts));

  mkdirFn(join(options.destDir, 'media'), { recursive: true });
  mkdirFn(join(options.destDir, 'templates'), { recursive: true });

  // ── media ──────────────────────────────────────────────────────────────────
  const srcMedia = readManifestItems(
    join(options.sourceDir, 'media.json'),
    MediaFileMetaSchema,
  );
  const destMedia = readManifestItems(
    join(options.destDir, 'media.json'),
    MediaFileMetaSchema,
  );
  const destHashes = new Set(destMedia.map((m) => m.sha256));
  const mergedMedia: MediaFileMeta[] = [...destMedia];

  for (const item of srcMedia) {
    if (destHashes.has(item.sha256)) {
      continue; // already present by content
    }
    const srcFile = join(options.sourceDir, 'media', `${item.id}.bin`);
    const destFile = join(options.destDir, 'media', `${item.id}.bin`);
    if (!existsFn(srcFile)) {
      continue; // orphaned manifest entry — skip
    }
    if (!existsFn(destFile)) {
      copyFileFn(srcFile, destFile);
    }
    mergedMedia.push(item);
    destHashes.add(item.sha256);
  }

  // ── templates ──────────────────────────────────────────────────────────────
  const srcTemplates = readManifestItems(
    join(options.sourceDir, 'templates.json'),
    LabelTemplateMetaSchema,
  );
  const destTemplates = readManifestItems(
    join(options.destDir, 'templates.json'),
    LabelTemplateMetaSchema,
  );
  const destById = new Map(destTemplates.map((t) => [t.id, t]));

  for (const item of srcTemplates) {
    const existing = destById.get(item.id);
    if (existing !== undefined && existing.updatedAt >= item.updatedAt) {
      continue; // dest has same or newer version
    }
    // Copy the template JSON body
    const srcFile = join(options.sourceDir, 'templates', `${item.id}.json`);
    const destFile = join(options.destDir, 'templates', `${item.id}.json`);
    if (!existsFn(srcFile)) {
      continue;
    }
    if (!existsFn(destFile) || (existing !== undefined && existing.updatedAt < item.updatedAt)) {
      copyFileFn(srcFile, destFile);
    }
    destById.set(item.id, item);
  }

  const mergedTemplates = [...destById.values()];

  return { media: mergedMedia, templates: mergedTemplates };
}

/**
 * Read a full template from the shared folder. Used after merging when we need
 * to reconstruct the full template body from the shared directory.
 */
export function readTemplateFromDir(
  dir: string,
  id: string,
  readFileFn: (p: string) => string = (p) => readFileSync(p, 'utf8'),
): LabelTemplate | null {
  try {
    const raw: unknown = JSON.parse(readFileFn(join(dir, 'templates', `${id}.json`)));
    const parsed = LabelTemplateSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
