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

export type DitherMode = 'threshold' | 'floyd-steinberg';
