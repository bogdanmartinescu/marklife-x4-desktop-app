import { describe, expect, it } from 'vitest';
import {
  PHOMEMO_M110_BYTES_PER_LINE,
  PHOMEMO_M110_WIDTH_PX,
  buildPhomemoM110Job,
  encodePhomemoM110Commands,
  placeOnPhomemoHead,
} from '../../../src/languages/escpos/phomemo-m110.js';

describe('encodePhomemoM110Commands', () => {
  it('emits speed, density, media, GS v 0, raster, and footer', () => {
    const raster = new Uint8Array(PHOMEMO_M110_BYTES_PER_LINE * 2);
    raster[0] = 0x80;
    const bytes = encodePhomemoM110Commands({
      raster,
      height: 2,
      speed: 5,
      density: 15,
      media: 'gap',
    });
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x1b, 0x4e, 0x0d, 0x05]);
    expect(Array.from(bytes.slice(4, 8))).toEqual([0x1b, 0x4e, 0x04, 0x0f]);
    expect(Array.from(bytes.slice(8, 11))).toEqual([0x1f, 0x11, 0x0a]);
    expect(Array.from(bytes.slice(11, 19))).toEqual([0x1d, 0x76, 0x30, 0x00, 0x30, 0x00, 0x02, 0x00]);
    expect(bytes[19]).toBe(0x80);
    expect(Array.from(bytes.slice(-8))).toEqual([0x1f, 0xf0, 0x05, 0x00, 0x1f, 0xf0, 0x03, 0x00]);
  });

  it('maps continuous and black-mark media bytes', () => {
    const raster = new Uint8Array(PHOMEMO_M110_BYTES_PER_LINE);
    expect(encodePhomemoM110Commands({ raster, height: 1, media: 'continuous' })[10]).toBe(0x0b);
    expect(encodePhomemoM110Commands({ raster, height: 1, media: 'black-mark' })[10]).toBe(0x26);
  });
});

describe('placeOnPhomemoHead', () => {
  it('keeps a 40 mm editor bitmap at 320 dots so a centered mark stays at 20 mm', () => {
    const width = 320;
    const height = 4;
    const gray = new Uint8Array(width * height).fill(255);
    gray[160] = 0;
    const placed = placeOnPhomemoHead({ gray, width, height });
    expect(placed.width).toBe(320);
    expect(placed.data.length).toBe(320 * height);
    expect(placed.data[160]).toBe(0);
  });

  it('applies calibration offset from the left of the label', () => {
    const gray = new Uint8Array(8).fill(255);
    gray[0] = 0;
    const placed = placeOnPhomemoHead({ gray, width: 8, height: 1, offsetXpx: 10 });
    expect(placed.width).toBe(24);
    expect(placed.data[10]).toBe(0);
    expect(placed.data[0]).toBe(255);
  });

  it('center-crops a wider page so a centered mark stays centered without changing height', () => {
    const width = 768;
    const height = 4;
    const gray = new Uint8Array(width * height).fill(255);
    gray[384] = 0;
    const placed = placeOnPhomemoHead({ gray, width, height });
    expect(placed.height).toBe(4);
    expect(placed.width).toBe(PHOMEMO_M110_WIDTH_PX);
    expect(placed.data[192]).toBe(0);
  });
});

describe('buildPhomemoM110Job', () => {
  it('sends GS v 0 width in bytes of the label bitmap, not the 48 mm head', () => {
    const width = 320;
    const height = 8;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
    const bytes = buildPhomemoM110Job({
      image: { width, height, data },
      widthMm: 40,
      heightMm: 12,
      dpi: 203,
      density: 15,
      speed: 5,
      media: { mode: 'gap', gapHeightMm: 2, gapOffsetMm: 0 },
    });
    const header = bytes.subarray(11, 19);
    expect(Array.from(header.slice(0, 4))).toEqual([0x1d, 0x76, 0x30, 0x00]);
    expect((header[4] ?? 0) + (header[5] ?? 0) * 256).toBe(40);
  });
});
