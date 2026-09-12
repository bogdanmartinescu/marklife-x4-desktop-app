import { describe, expect, it } from 'vitest';
import { isBelowPrintResolution } from '../../src/bitmap/print-resolution.js';

describe('isBelowPrintResolution', () => {
  it('flags a 599×376 photo on a 100×150 mm 203 DPI label', () => {
    expect(
      isBelowPrintResolution({
        sourceWidth: 599,
        sourceHeight: 376,
        widthMm: 100,
        heightMm: 150,
        dpi: 203,
      }),
    ).toBe(true);
  });

  it('accepts an 800×1200 photo on the same label', () => {
    expect(
      isBelowPrintResolution({
        sourceWidth: 800,
        sourceHeight: 1200,
        widthMm: 100,
        heightMm: 150,
        dpi: 203,
      }),
    ).toBe(false);
  });

  it('uses 90% slack so a near-target photo is not low-res', () => {
    expect(
      isBelowPrintResolution({
        sourceWidth: 720,
        sourceHeight: 1080,
        widthMm: 100,
        heightMm: 150,
        dpi: 203,
      }),
    ).toBe(false);
  });

  it('flags a phone photo on A4 at 300 DPI', () => {
    expect(
      isBelowPrintResolution({
        sourceWidth: 1200,
        sourceHeight: 1600,
        widthMm: 210,
        heightMm: 297,
        dpi: 300,
      }),
    ).toBe(true);
  });

  it('accepts an A4 page already rasterized at 300 DPI', () => {
    expect(
      isBelowPrintResolution({
        sourceWidth: 2480,
        sourceHeight: 3508,
        widthMm: 210,
        heightMm: 297,
        dpi: 300,
      }),
    ).toBe(false);
  });

  it('returns false when needed dots are zero', () => {
    expect(
      isBelowPrintResolution({
        sourceWidth: 10,
        sourceHeight: 10,
        widthMm: 0,
        heightMm: 150,
        dpi: 203,
      }),
    ).toBe(false);
  });
});
