export interface RgbaImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface MonoBitmap {
  width: number;
  height: number;
  bytesPerRow: number;
  data: Uint8Array;
}

export type BitOrder = 'msb-first' | 'lsb-first';

export interface BitmapEncoding {
  bitOrder: BitOrder;
  blackBit: 0 | 1;
  rowAlignmentBytes: number;
  tsplMode: number;
}

export const DEFAULT_BITMAP_ENCODING: BitmapEncoding = {
  bitOrder: 'msb-first',
  blackBit: 1,
  rowAlignmentBytes: 1,
  tsplMode: 1,
};

/**
 * Firmware polarity if applied at pack time (X4_05A1 2026-09-11).
 * Live X4 jobs invert RGBA in the renderer instead so Electron HMR can apply it.
 */
export const X4_BITMAP_ENCODING: BitmapEncoding = {
  bitOrder: 'msb-first',
  blackBit: 0,
  rowAlignmentBytes: 1,
  tsplMode: 0,
};

export type DitherMode = 'threshold' | 'floyd-steinberg';
