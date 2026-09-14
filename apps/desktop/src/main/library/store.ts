import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ZodType } from 'zod';
import {
  isMediaMimeType,
  isSafeLibraryId,
  LabelTemplateMetaSchema,
  LabelTemplateSchema,
  LIBRARY_MAX_BYTES,
  LIBRARY_MAX_ITEMS,
  MediaFileMetaSchema,
  PrintHistoryMetaSchema,
  TEMPLATE_MAX_BYTES,
  TEMPLATE_MAX_ITEMS,
  ThermalBridgeError,
  type AddPrintHistoryInput,
  type LabelTemplate,
  type LabelTemplateMeta,
  type MediaFileMeta,
  type MediaFileResult,
  type PrintHistoryMeta,
  type SaveLabelTemplateInput,
} from '@thermalbridge/shared';

interface MediaManifest {
  items: MediaFileMeta[];
}

interface HistoryManifest {
  items: PrintHistoryMeta[];
}

interface TemplateManifest {
  items: LabelTemplateMeta[];
}

export interface LibraryStoreOptions {
  /**
   * Directory that holds machine-local data (print history).
   * When sync is disabled this also holds media and templates.
   */
  localDir: string;
  /**
   * Directory that holds shared data (media and templates).
   * Set to the same value as `localDir` when sync is disabled.
   */
  sharedDir: string;
}

export class LibraryStore {
  private readonly localDir: string;
  private readonly sharedDir: string;

  constructor(options: LibraryStoreOptions | string) {
    if (typeof options === 'string') {
      // Legacy single-root constructor — sync disabled.
      this.localDir = options;
      this.sharedDir = options;
    } else {
      this.localDir = options.localDir;
      this.sharedDir = options.sharedDir;
    }
  }

  // ── media ──────────────────────────────────────────────────────────────────

  listMedia(): MediaFileMeta[] {
    return this.readMedia().items;
  }

  addMedia(name: string, mimeType: string, data: Uint8Array): MediaFileMeta {
    if (!isMediaMimeType(mimeType)) {
      throw new ThermalBridgeError('FILE_UNSUPPORTED', `Unsupported media type: ${mimeType}`);
    }
    if (data.byteLength === 0 || data.byteLength > LIBRARY_MAX_BYTES) {
      throw new ThermalBridgeError('FILE_UNSUPPORTED', 'Media file is empty or larger than 20 MB');
    }
    const sha256 = sha256Hex(data);
    const existing = this.readMedia().items.find((item) => item.sha256 === sha256);
    if (existing) {
      return existing;
    }
    this.ensureDirs();
    const item: MediaFileMeta = {
      id: `med-${randomUUID()}`,
      name: basename(name),
      mimeType,
      byteLength: data.byteLength,
      sha256,
      createdAt: new Date().toISOString(),
    };
    writeFileSync(this.mediaPath(item.id), data);
    this.writeMedia({ items: capNewest([item, ...this.readMedia().items], this.mediaPath.bind(this)) });
    return item;
  }

  getMedia(id: string): MediaFileResult {
    const meta = this.readMedia().items.find((item) => item.id === id);
    if (!meta || !isSafeLibraryId(id)) {
      throw new ThermalBridgeError('LIBRARY_NOT_FOUND', 'Media file was not found');
    }
    const data = new Uint8Array(readFileSync(this.mediaPath(id)));
    return { meta, data };
  }

  removeMedia(id: string): void {
    if (!isSafeLibraryId(id)) {
      throw new ThermalBridgeError('LIBRARY_NOT_FOUND', 'Media file was not found');
    }
    const items = this.readMedia().items.filter((item) => item.id !== id);
    this.removeFile(this.mediaPath(id));
    this.writeMedia({ items });
  }

  // ── history ────────────────────────────────────────────────────────────────

  listHistory(): PrintHistoryMeta[] {
    return this.readHistory().items;
  }

  addHistory(input: AddPrintHistoryInput): PrintHistoryMeta {
    if (input.png.byteLength === 0 || input.png.byteLength > LIBRARY_MAX_BYTES) {
      throw new ThermalBridgeError('FILE_UNSUPPORTED', 'Print preview is empty or larger than 20 MB');
    }
    this.ensureDirs();
    const { png, ...rest } = input;
    const item = PrintHistoryMetaSchema.parse({
      ...rest,
      id: `job-${randomUUID()}`,
      printedAt: new Date().toISOString(),
    });
    writeFileSync(this.historyPath(item.id), png);
    this.writeHistory({
      items: capNewest([item, ...this.readHistory().items], this.historyPath.bind(this)),
    });
    return item;
  }

  getHistoryPng(id: string): Uint8Array {
    const meta = this.readHistory().items.find((item) => item.id === id);
    if (!meta || !isSafeLibraryId(id)) {
      throw new ThermalBridgeError('LIBRARY_NOT_FOUND', 'Print history item was not found');
    }
    return new Uint8Array(readFileSync(this.historyPath(id)));
  }

  removeHistory(id: string): void {
    if (!isSafeLibraryId(id)) {
      throw new ThermalBridgeError('LIBRARY_NOT_FOUND', 'Print history item was not found');
    }
    const items = this.readHistory().items.filter((item) => item.id !== id);
    this.removeFile(this.historyPath(id));
    this.writeHistory({ items });
  }

  // ── templates ──────────────────────────────────────────────────────────────

  listTemplates(): LabelTemplateMeta[] {
    return this.readTemplates().items;
  }

  saveTemplate(input: SaveLabelTemplateInput): LabelTemplate {
    const name = input.name.trim();
    if (name.length === 0) {
      throw new ThermalBridgeError('FILE_UNSUPPORTED', 'Template name is required');
    }
    const now = new Date().toISOString();
    const existingId = input.id;
    const existingMeta =
      existingId !== undefined
        ? this.readTemplates().items.find((item) => item.id === existingId)
        : undefined;
    if (existingId !== undefined && (!existingMeta || !isSafeLibraryId(existingId))) {
      throw new ThermalBridgeError('LIBRARY_NOT_FOUND', 'Template was not found');
    }
    const id = existingMeta?.id ?? `tpl-${randomUUID()}`;
    const existing = existingMeta ? this.readTemplateFile(existingMeta.id) : undefined;
    const item = LabelTemplateSchema.parse({
      id,
      name,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      widthMm: input.widthMm,
      heightMm: input.heightMm,
      pages: input.pages,
    });
    const json = `${JSON.stringify(item)}\n`;
    if (Buffer.byteLength(json, 'utf8') > TEMPLATE_MAX_BYTES) {
      throw new ThermalBridgeError('FILE_UNSUPPORTED', 'Template is larger than 2 MB');
    }
    this.ensureDirs();
    atomicWriteFile(this.templatePath(item.id), Buffer.from(json, 'utf8'));
    const meta = templateMeta(item);
    this.writeTemplates({
      items: capNewest(
        [meta, ...this.readTemplates().items.filter((row) => row.id !== item.id)],
        this.templatePath.bind(this),
        TEMPLATE_MAX_ITEMS,
      ),
    });
    return item;
  }

  getTemplate(id: string): LabelTemplate {
    if (!isSafeLibraryId(id)) {
      throw new ThermalBridgeError('LIBRARY_NOT_FOUND', 'Template was not found');
    }
    const meta = this.readTemplates().items.find((item) => item.id === id);
    if (!meta) {
      throw new ThermalBridgeError('LIBRARY_NOT_FOUND', 'Template was not found');
    }
    return this.readTemplateFile(id);
  }

  removeTemplate(id: string): void {
    if (!isSafeLibraryId(id)) {
      throw new ThermalBridgeError('LIBRARY_NOT_FOUND', 'Template was not found');
    }
    const items = this.readTemplates().items.filter((item) => item.id !== id);
    this.removeFile(this.templatePath(id));
    this.writeTemplates({ items });
  }

  // ── private: paths ─────────────────────────────────────────────────────────

  private ensureDirs(): void {
    mkdirSync(join(this.sharedDir, 'media'), { recursive: true });
    mkdirSync(join(this.sharedDir, 'templates'), { recursive: true });
    mkdirSync(join(this.localDir, 'history'), { recursive: true });
  }

  /** Media files live in the shared root. */
  private mediaPath(id: string): string {
    return join(this.sharedDir, 'media', `${id}.bin`);
  }

  /** History is machine-local. */
  private historyPath(id: string): string {
    return join(this.localDir, 'history', `${id}.png`);
  }

  /** Template bodies live in the shared root. */
  private templatePath(id: string): string {
    return join(this.sharedDir, 'templates', `${id}.json`);
  }

  private mediaManifestPath(): string {
    return join(this.sharedDir, 'media.json');
  }

  private historyManifestPath(): string {
    return join(this.localDir, 'history.json');
  }

  private templatesManifestPath(): string {
    return join(this.sharedDir, 'templates.json');
  }

  // ── private: read/write ────────────────────────────────────────────────────

  private readMedia(): MediaManifest {
    return { items: readManifest(this.mediaManifestPath(), MediaFileMetaSchema) };
  }

  private writeMedia(manifest: MediaManifest): void {
    this.ensureDirs();
    atomicWriteJson(this.mediaManifestPath(), manifest);
  }

  private readHistory(): HistoryManifest {
    return { items: readManifest(this.historyManifestPath(), PrintHistoryMetaSchema) };
  }

  private writeHistory(manifest: HistoryManifest): void {
    this.ensureDirs();
    atomicWriteJson(this.historyManifestPath(), manifest);
  }

  private readTemplates(): TemplateManifest {
    return { items: readManifest(this.templatesManifestPath(), LabelTemplateMetaSchema) };
  }

  private writeTemplates(manifest: TemplateManifest): void {
    this.ensureDirs();
    atomicWriteJson(this.templatesManifestPath(), manifest);
  }

  private readTemplateFile(id: string): LabelTemplate {
    try {
      const raw: unknown = JSON.parse(readFileSync(this.templatePath(id), 'utf8'));
      return LabelTemplateSchema.parse(raw);
    } catch {
      throw new ThermalBridgeError('LIBRARY_NOT_FOUND', 'Template was not found');
    }
  }

  private removeFile(path: string): void {
    try {
      rmSync(path);
    } catch {
      // Missing files are fine during delete.
    }
  }
}

// ─── file utilities ───────────────────────────────────────────────────────────

/**
 * Write `data` to `destPath` atomically using a temp file + rename so the OS
 * (and Dropbox) never observes a half-written file.
 */
function atomicWriteFile(destPath: string, data: Buffer): void {
  const tmpPath = `${destPath}.tmp`;
  writeFileSync(tmpPath, data);
  renameSync(tmpPath, destPath);
}

function atomicWriteJson(destPath: string, value: unknown): void {
  atomicWriteFile(destPath, Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8'));
}

function sha256Hex(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

function basename(name: string): string {
  const trimmed = name.trim().replace(/\\/g, '/');
  const parts = trimmed.split('/');
  const last = parts[parts.length - 1];
  return last && last.length > 0 ? last : 'file';
}

function readManifest<T>(path: string, schema: ZodType<T>): T[] {
  try {
    const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (typeof raw !== 'object' || raw === null || !('items' in raw) || !Array.isArray(raw.items)) {
      return [];
    }
    return raw.items.flatMap((item) => {
      const parsed = schema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

function templateMeta(item: LabelTemplate): LabelTemplateMeta {
  return {
    id: item.id,
    name: item.name,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    widthMm: item.widthMm,
    heightMm: item.heightMm,
    pageCount: item.pages.length,
  };
}

function capNewest<T extends { id: string }>(
  items: T[],
  pathForId: (id: string) => string,
  max = LIBRARY_MAX_ITEMS,
): T[] {
  if (items.length <= max) {
    return items;
  }
  const kept = items.slice(0, max);
  for (const dropped of items.slice(max)) {
    try {
      rmSync(pathForId(dropped.id));
    } catch {
      // Best-effort cleanup of overflow files.
    }
  }
  return kept;
}
