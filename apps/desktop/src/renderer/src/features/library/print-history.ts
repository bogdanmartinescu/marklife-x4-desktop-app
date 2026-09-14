import type { AddPrintHistoryInput, PrintHistoryMeta } from '@thermalbridge/shared';
import type { PrintDraft } from '@/state/types.js';

export function printHistoryInput(options: {
  jobName: string;
  printerName: string;
  draft: PrintDraft;
  widthMm: number;
  heightMm: number;
  width: number;
  height: number;
  dpi: number;
  copies: number;
  png: Uint8Array;
}): AddPrintHistoryInput {
  const { draft } = options;
  return {
    jobName: options.jobName,
    printerId: draft.printerId,
    printerName: options.printerName,
    profileId: draft.profileId,
    widthMm: options.widthMm,
    heightMm: options.heightMm,
    width: options.width,
    height: options.height,
    dpi: options.dpi,
    copies: options.copies,
    density: draft.density,
    speed: draft.speed,
    mediaMode: draft.mediaMode,
    gapHeightMm: draft.gapHeightMm,
    gapOffsetMm: draft.gapOffsetMm,
    markHeightMm: draft.markHeightMm,
    markOffsetMm: draft.markOffsetMm,
    dither: draft.dither,
    threshold: draft.threshold,
    rotation: draft.rotation,
    mirrorX: draft.mirrorX,
    mirrorY: draft.mirrorY,
    negative: draft.negative,
    offsetXmm: draft.offsetXmm,
    offsetYmm: draft.offsetYmm,
    fitMode: draft.fitMode,
    png: options.png,
  };
}

export function formatByteSize(bytes: number): string {
  if (bytes < 1024) {
    return `${String(bytes)} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatWhen(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(locale === 'ro' ? 'ro-RO' : 'en-GB');
}

export function historyDayKey(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const startOfDay = (value: Date): number =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const diff = startOfDay(now) - startOfDay(date);
  const dayMs = 24 * 60 * 60 * 1000;
  if (diff === 0) {
    return 'today';
  }
  if (diff === dayMs) {
    return 'yesterday';
  }
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function filterHistoryItems(
  items: readonly PrintHistoryMeta[],
  query: string,
): PrintHistoryMeta[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return [...items];
  }
  return items.filter((item) => {
    const haystack = `${item.jobName} ${item.printerName}`.toLowerCase();
    return haystack.includes(needle);
  });
}

export interface HistoryDayGroup {
  key: string;
  items: PrintHistoryMeta[];
}

export function groupHistoryItems(
  items: readonly PrintHistoryMeta[],
  now: Date = new Date(),
): HistoryDayGroup[] {
  const groups: HistoryDayGroup[] = [];
  for (const item of items) {
    const key = historyDayKey(item.printedAt, now);
    const current = groups[groups.length - 1];
    if (current !== undefined && current.key === key) {
      current.items.push(item);
      continue;
    }
    groups.push({ key, items: [item] });
  }
  return groups;
}
