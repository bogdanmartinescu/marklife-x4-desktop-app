import type { AddPrintHistoryInput } from '@thermalbridge/shared';
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
