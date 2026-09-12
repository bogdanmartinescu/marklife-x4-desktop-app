import { describe, expect, it } from 'vitest';
import {
  applyInkjetCmyk,
  cmykToRgb,
  prepareInkjetRgba,
  rgbToCmyk,
} from '../../src/bitmap/cmyk.js';

describe('rgbToCmyk', () => {
  it('maps pure black to K-only', () => {
    expect(rgbToCmyk(0, 0, 0)).toEqual({ c: 0, m: 0, y: 0, k: 1 });
  });

  it('maps white to no ink', () => {
    expect(rgbToCmyk(255, 255, 255)).toEqual({ c: 0, m: 0, y: 0, k: 0 });
  });

  it('maps additive red to magenta+yellow', () => {
    expect(rgbToCmyk(255, 0, 0)).toEqual({ c: 0, m: 1, y: 1, k: 0 });
  });
});

describe('cmykToRgb', () => {
  it('round-trips the primary conversions', () => {
    expect(cmykToRgb({ c: 0, m: 0, y: 0, k: 1 })).toEqual({ r: 0, g: 0, b: 0 });
    expect(cmykToRgb({ c: 0, m: 0, y: 0, k: 0 })).toEqual({ r: 255, g: 255, b: 255 });
    expect(cmykToRgb({ c: 0, m: 1, y: 1, k: 0 })).toEqual({ r: 255, g: 0, b: 0 });
  });
});

describe('applyInkjetCmyk', () => {
  it('replaces near-black RGB with K-only so text does not become rich black', () => {
    expect(applyInkjetCmyk(rgbToCmyk(10, 8, 12), { r: 10, g: 8, b: 12 })).toEqual({
      c: 0,
      m: 0,
      y: 0,
      k: 1 - 12 / 255,
    });
  });

  it('replaces a warm gray with K-only from luminance', () => {
    const applied = applyInkjetCmyk(rgbToCmyk(180, 175, 170), { r: 180, g: 175, b: 170 });
    expect(applied.c).toBe(0);
    expect(applied.m).toBe(0);
    expect(applied.y).toBe(0);
    expect(applied.k).toBeGreaterThan(0.2);
    expect(applied.k).toBeLessThan(0.4);
  });
});

describe('prepareInkjetRgba', () => {
  it('keeps pure black and white', () => {
    const input = new Uint8Array([0, 0, 0, 255, 255, 255, 255, 255]);
    expect(Array.from(prepareInkjetRgba(input))).toEqual([0, 0, 0, 255, 255, 255, 255, 255]);
  });

  it('leaves saturated red printable (no grayscale)', () => {
    const out = prepareInkjetRgba(new Uint8Array([255, 0, 0, 255]));
    expect(out[0]).toBe(255);
    expect(out[1]).toBe(0);
    expect(out[2]).toBe(0);
    expect(out[3]).toBe(255);
  });

  it('neutralizes a warm gray so it prints as K', () => {
    const out = prepareInkjetRgba(new Uint8Array([180, 175, 170, 255]));
    expect(out[0]).toBe(out[1]);
    expect(out[1]).toBe(out[2]);
    expect(out[0]).toBeGreaterThan(170);
    expect(out[0]).toBeLessThan(180);
    expect(out[3]).toBe(255);
  });

  it('preserves alpha', () => {
    const out = prepareInkjetRgba(new Uint8Array([255, 0, 0, 128]));
    expect(out[3]).toBe(128);
  });
});
