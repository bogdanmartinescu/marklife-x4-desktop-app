import type { FitMode, Rotation } from '@thermalbridge/thermal-core';
import type { AppSettings, PrinterInfo } from '@thermalbridge/shared';

export type Screen = 'print' | 'setup' | 'calibration' | 'diagnostics';

export interface SourceDocument {
  name: string;
  mimeType: string;
  bytes: Uint8Array;
  pageCount: number;
  pageNumber: number;
}

export interface PrintDraft {
  printerId: string;
  profileId: string;
  widthMm: number;
  heightMm: number;
  mediaMode: 'continuous' | 'gap' | 'black-mark';
  gapHeightMm: number;
  gapOffsetMm: number;
  markHeightMm: number;
  markOffsetMm: number;
  density: number;
  speed: number;
  copies: number;
  dither: 'threshold' | 'floyd-steinberg';
  threshold: number;
  rotation: Rotation;
  fitMode: FitMode;
  mirrorX: boolean;
  mirrorY: boolean;
  negative: boolean;
  offsetXmm: number;
  offsetYmm: number;
  diagnosticTsplOverSpp: boolean;
}

export interface AppModel {
  screen: Screen;
  settings: AppSettings | null;
  printers: PrinterInfo[];
  source: SourceDocument | null;
  draft: PrintDraft;
  status: string;
  busy: boolean;
}
