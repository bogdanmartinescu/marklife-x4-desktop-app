import { describe, expect, it } from 'vitest';
import { encodeRgbaPng } from './encode-png.js';
import { cupsMediaName } from './cups-media.js';

describe('encodeRgbaPng', () => {
  it('writes a PNG signature and IHDR for an RGBA buffer', () => {
    const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
    const png = encodeRgbaPng({ width: 2, height: 1, data: rgba, dpi: 300 });
    expect(Array.from(png.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(Buffer.from(png).includes(Buffer.from('IHDR'))).toBe(true);
    expect(Buffer.from(png).includes(Buffer.from('IDAT'))).toBe(true);
    expect(Buffer.from(png).includes(Buffer.from('IEND'))).toBe(true);
  });
});

describe('cupsMediaName', () => {
  it('maps A4 millimetres to the CUPS A4 media name', () => {
    expect(cupsMediaName(210, 297)).toBe('A4');
    expect(cupsMediaName(297, 210)).toBe('A4');
  });

  it('falls back to rounded millimetres for a custom size', () => {
    expect(cupsMediaName(100, 150)).toBe('100x150mm');
  });
});
