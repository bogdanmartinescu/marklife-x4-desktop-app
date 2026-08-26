import type { RgbaImage } from './types.js';

export function rgbaToGrayscale(image: RgbaImage): Uint8Array {
  const { width, height, data } = image;
  const out = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    const r = data[offset] ?? 0;
    const g = data[offset + 1] ?? 0;
    const b = data[offset + 2] ?? 0;
    const a = (data[offset + 3] ?? 255) / 255;
    const cr = r * a + 255 * (1 - a);
    const cg = g * a + 255 * (1 - a);
    const cb = b * a + 255 * (1 - a);
    out[i] = Math.round(0.2126 * cr + 0.7152 * cg + 0.0722 * cb);
  }

  return out;
}
