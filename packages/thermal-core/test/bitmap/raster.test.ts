import { describe, expect, it } from 'vitest';
import { applyThreshold } from '../../src/bitmap/threshold.js';
import { floydSteinberg } from '../../src/bitmap/floyd-steinberg.js';
import { rgbaToGrayscale } from '../../src/bitmap/grayscale.js';
import { packBits } from '../../src/bitmap/pack-bits.js';
import type { RgbaImage } from '../../src/bitmap/types.js';

function rgba(pixels: Array<[number, number, number, number]>, width: number, height: number): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i++) {
    const pixel = pixels[i] ?? [0, 0, 0, 255];
    data.set(pixel, i * 4);
  }
  return { width, height, data };
}

describe('rgbaToGrayscale', () => {
  it('converts opaque white RGBA to grayscale 255', () => {
    const image = rgba([[255, 255, 255, 255]], 1, 1);
    expect(Array.from(rgbaToGrayscale(image))).toEqual([255]);
  });

  it('converts opaque black RGBA to grayscale 0', () => {
    const image = rgba([[0, 0, 0, 255]], 1, 1);
    expect(Array.from(rgbaToGrayscale(image))).toEqual([0]);
  });

  it('composites fully transparent pixels onto white (not black)', () => {
    const image = rgba([[0, 0, 0, 0]], 1, 1);
    expect(Array.from(rgbaToGrayscale(image))).toEqual([255]);
  });

  it('converts an 8×1 solid black row to eight zeros', () => {
    const pixels = Array.from({ length: 8 }, () => [0, 0, 0, 255] as [number, number, number, number]);
    expect(Array.from(rgbaToGrayscale(rgba(pixels, 8, 1)))).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('converts an 8×1 solid white row to eight 255s', () => {
    const pixels = Array.from({ length: 8 }, () => [255, 255, 255, 255] as [number, number, number, number]);
    expect(Array.from(rgbaToGrayscale(rgba(pixels, 8, 1)))).toEqual([
      255, 255, 255, 255, 255, 255, 255, 255,
    ]);
  });
});

describe('applyThreshold', () => {
  it('maps grayscale 0 to black pixel 1', () => {
    expect(Array.from(applyThreshold(new Uint8Array([0])))).toEqual([1]);
  });

  it('maps grayscale 255 to white pixel 0', () => {
    expect(Array.from(applyThreshold(new Uint8Array([255])))).toEqual([0]);
  });

  it('uses 128 as the default cutoff (127 → black, 128 → white)', () => {
    expect(Array.from(applyThreshold(new Uint8Array([127, 128])))).toEqual([1, 0]);
  });

  it('keeps an 8×8 checkerboard after threshold', () => {
    const gray = new Uint8Array(64);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        gray[y * 8 + x] = (x + y) % 2 === 0 ? 0 : 255;
      }
    }
    const pixels = applyThreshold(gray);
    expect(Array.from(packBits(pixels, 8, 8).data)).toEqual([
      0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55,
    ]);
  });
});

describe('floydSteinberg', () => {
  it('emits only 0 and 1 pixel values', () => {
    const gray = new Uint8Array([10, 80, 128, 200, 250, 40, 90, 160]);
    const out = floydSteinberg(gray, 8, 1);
    expect(out.length).toBe(8);
    for (const value of out) {
      expect(value === 0 || value === 1).toBe(true);
    }
  });

  it('produces all-black output for a solid black 8×1 input', () => {
    const out = floydSteinberg(new Uint8Array(8).fill(0), 8, 1);
    expect(Array.from(out)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('produces mostly-black output for a near-black 8×8 block', () => {
    const gray = new Uint8Array(64).fill(5);
    const out = floydSteinberg(gray, 8, 8);
    const black = out.reduce((sum, value) => sum + value, 0);
    expect(black).toBeGreaterThan(48);
    for (const value of out) {
      expect(value === 0 || value === 1).toBe(true);
    }
  });
});
