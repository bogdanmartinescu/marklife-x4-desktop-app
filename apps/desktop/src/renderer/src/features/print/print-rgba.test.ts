import { describe, expect, it } from 'vitest';
import { printRgbaForProfile } from './print-rgba.js';

describe('printRgbaForProfile', () => {
  it('inverts X4 print pixels so firmware polarity matches the on-screen preview', () => {
    const rgba = new Uint8Array([0, 0, 0, 255, 255, 255, 255, 255]);
    expect(Array.from(printRgbaForProfile('marklife-x4', rgba))).toEqual([
      255, 255, 255, 255, 0, 0, 0, 255,
    ]);
  });

  it('leaves other thermal profiles unchanged', () => {
    const rgba = new Uint8Array([0, 0, 0, 255]);
    expect(printRgbaForProfile('phomemo-m110', rgba)).toBe(rgba);
  });

  it('prepares inkjet pixels as CMYK so a warm gray becomes K-only', () => {
    const rgba = new Uint8Array([180, 175, 170, 255]);
    const out = printRgbaForProfile('canon-inkjet', rgba);
    expect(out).not.toBe(rgba);
    expect(out[0]).toBe(out[1]);
    expect(out[1]).toBe(out[2]);
  });
});

