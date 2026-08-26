import {
  DEFAULT_BITMAP_ENCODING,
  type BitmapEncoding,
  type MonoBitmap,
} from './types.js';

export function packBits(
  pixels: Uint8Array,
  width: number,
  height: number,
  encoding: BitmapEncoding = DEFAULT_BITMAP_ENCODING,
): MonoBitmap {
  if (width <= 0 || height <= 0) {
    throw new Error(`Invalid bitmap size ${width}x${height}`);
  }
  if (pixels.length < width * height) {
    throw new Error(
      `Pixel buffer too small: ${pixels.length} < ${width * height}`,
    );
  }

  const alignment = Math.max(1, encoding.rowAlignmentBytes);
  const rawBytes = Math.ceil(width / 8);
  const bytesPerRow = Math.ceil(rawBytes / alignment) * alignment;
  const data = new Uint8Array(bytesPerRow * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isBlack = (pixels[y * width + x] ?? 0) !== 0;
      const shouldSet = encoding.blackBit === 1 ? isBlack : !isBlack;
      if (!shouldSet) {
        continue;
      }

      const byteIndex = y * bytesPerRow + (x >> 3);
      const bit = encoding.bitOrder === 'msb-first' ? 7 - (x & 7) : x & 7;
      data[byteIndex]! |= 1 << bit;
    }
  }

  return { width, height, bytesPerRow, data };
}
