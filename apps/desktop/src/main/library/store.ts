import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

export class LibraryStore {
  constructor(private readonly rootDir: string) {}

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
    writeFileSync(this.templatePath(item.id), json, 'utf8');
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

  private ensureDirs(): void {
    mkdirSync(join(this.rootDir, 'media'), { recursive: true });
    mkdirSync(join(this.rootDir, 'history'), { recursive: true });
    mkdirSync(join(this.rootDir, 'templates'), { recursive: true });
  }

  private mediaPath(id: string): string {
    return join(this.rootDir, 'media', `${id}.bin`);
  }

  private historyPath(id: string): string {
    return join(this.rootDir, 'history', `${id}.png`);
  }

  private templatePath(id: string): string {
    return join(this.rootDir, 'templates', `${id}.json`);
  }

  private mediaManifestPath(): string {
    return join(this.rootDir, 'media.json');
  }

  private historyManifestPath(): string {
    return join(this.rootDir, 'history.json');
  }

  private readMedia(): MediaManifest {
    return { items: readManifest(this.mediaManifestPath(), MediaFileMetaSchema) };
  }

  private writeMedia(manifest: MediaManifest): void {
    this.ensureDirs();
    writeFileSync(this.mediaManifestPath(), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  private readHistory(): HistoryManifest {
    return { items: readManifest(this.historyManifestPath(), PrintHistoryMetaSchema) };
  }

  private writeHistory(manifest: HistoryManifest): void {
    this.ensureDirs();
    writeFileSync(this.historyManifestPath(), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  }

  private templatesManifestPath(): string {
    return join(this.rootDir, 'templates.json');
  }

  private readTemplates(): TemplateManifest {
    return { items: readManifest(this.templatesManifestPath(), LabelTemplateMetaSchema) };
  }

  private writeTemplates(manifest: TemplateManifest): void {
    this.ensureDirs();
    writeFileSync(this.templatesManifestPath(), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
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
