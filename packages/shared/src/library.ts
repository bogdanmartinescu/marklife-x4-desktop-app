import { z } from 'zod';

export const MEDIA_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
] as const;

export type MediaMimeType = (typeof MEDIA_MIME_TYPES)[number];

export const MediaFileMetaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  mimeType: z.enum(MEDIA_MIME_TYPES),
  byteLength: z.number().int().positive(),
  sha256: z.string().length(64),
  createdAt: z.string().min(1),
});

export type MediaFileMeta = z.infer<typeof MediaFileMetaSchema>;

export const PrintHistoryMetaSchema = z.object({
  id: z.string().min(1),
  jobName: z.string().min(1),
  printedAt: z.string().min(1),
  printerId: z.string().min(1),
  printerName: z.string().min(1),
  profileId: z.string().min(1),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  dpi: z.number().positive(),
  copies: z.number().int().positive(),
  density: z.number().int().min(0).max(15),
  speed: z.number().positive(),
  mediaMode: z.enum(['continuous', 'gap', 'black-mark']),
  gapHeightMm: z.number().finite(),
  gapOffsetMm: z.number().finite(),
  markHeightMm: z.number().finite(),
  markOffsetMm: z.number().finite(),
  dither: z.enum(['threshold', 'floyd-steinberg']),
  threshold: z.number().int().min(0).max(255),
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  mirrorX: z.boolean(),
  mirrorY: z.boolean(),
  negative: z.boolean(),
  offsetXmm: z.number().finite(),
  offsetYmm: z.number().finite(),
  fitMode: z.enum(['fit', 'fill', 'actual', 'stretch']),
});

export type PrintHistoryMeta = z.infer<typeof PrintHistoryMetaSchema>;

export const OverlaySnapshotSchema = z.object({
  id: z.string().min(1),
  kind: z.enum([
    'text',
    'rect',
    'line',
    'qr',
    'barcode',
    'image',
    'circle',
    'arrow',
    'icon',
    'table',
    'field',
  ]),
  xMm: z.number().finite(),
  yMm: z.number().finite(),
  widthMm: z.number().finite().positive(),
  heightMm: z.number().finite().positive(),
  rotation: z.number().finite(),
  text: z.string(),
  fontSizeMm: z.number().finite(),
  fontFamily: z.string(),
  fontStyle: z.enum(['', 'bold', 'italic', 'bold italic']),
  align: z.enum(['left', 'center', 'right']),
  fill: z.enum(['black', 'white']),
  strokeMm: z.number().finite(),
  content: z.string(),
  qrEcl: z.enum(['L', 'M', 'Q', 'H']),
  barcodeFormat: z.enum(['CODE128', 'CODE39', 'EAN13', 'UPC']),
  barcodeDisplayValue: z.boolean(),
  src: z.string(),
  iconId: z.string(),
  tableRows: z.number().int().positive(),
  tableCols: z.number().int().positive(),
  fieldKind: z.enum(['date', 'serial', 'counter']),
  dateFormat: z.enum(['iso', 'eu', 'us']),
  serialStart: z.number().finite(),
  serialStep: z.number().finite(),
  serialPad: z.number().int().nonnegative(),
});

export type OverlaySnapshot = z.infer<typeof OverlaySnapshotSchema>;

export const TEMPLATE_MAX_ITEMS = 30;
export const TEMPLATE_MAX_BYTES = 2 * 1024 * 1024;
export const TEMPLATE_MAX_PAGES = 20;

export const TemplatePageSchema = z.object({
  overlays: z.array(OverlaySnapshotSchema).max(80),
});

export type TemplatePage = z.infer<typeof TemplatePageSchema>;

export const LabelTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  pages: z.array(TemplatePageSchema).min(1).max(TEMPLATE_MAX_PAGES),
});

export type LabelTemplate = z.infer<typeof LabelTemplateSchema>;

export const LabelTemplateMetaSchema = LabelTemplateSchema.omit({ pages: true }).extend({
  pageCount: z.number().int().positive(),
});

export type LabelTemplateMeta = z.infer<typeof LabelTemplateMetaSchema>;

export const LIBRARY_ID_PATTERN =
  /^(med|job|tpl)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isSafeLibraryId(id: string): boolean {
  return LIBRARY_ID_PATTERN.test(id);
}

export function isMediaMimeType(value: string): value is MediaMimeType {
  return (MEDIA_MIME_TYPES as readonly string[]).includes(value);
}

export const LIBRARY_MAX_ITEMS = 50;
export const LIBRARY_MAX_BYTES = 20 * 1024 * 1024;
