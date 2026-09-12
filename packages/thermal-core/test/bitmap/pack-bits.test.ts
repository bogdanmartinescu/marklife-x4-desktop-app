import { describe, expect, it } from 'vitest';
import { packBits } from '../../src/bitmap/pack-bits.js';
import { DEFAULT_BITMAP_ENCODING, X4_BITMAP_ENCODING } from '../../src/bitmap/types.js';

describe('packBits', () => {
  it('packs 8×1 solid black as [0xFF]', () => {
    const pixels = new Uint8Array(8).fill(1);
    expect(Array.from(packBits(pixels, 8, 1).data)).toEqual([0xff]);
  });

  it('packs 8×1 solid white as [0x00]', () => {
    const pixels = new Uint8Array(8).fill(0);
    expect(Array.from(packBits(pixels, 8, 1).data)).toEqual([0x00]);
  });

  it('places the leftmost pixel in the MSB (0x80)', () => {
    const pixels = new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0]);
    expect(Array.from(packBits(pixels, 8, 1).data)).toEqual([0x80]);
  });

  it('packs alternating 10101010 as [0xAA]', () => {
    const pixels = new Uint8Array([1, 0, 1, 0, 1, 0, 1, 0]);
    expect(Array.from(packBits(pixels, 8, 1).data)).toEqual([0xaa]);
  });

  it('packs 16×1 solid black as [0xFF, 0xFF]', () => {
    const pixels = new Uint8Array(16).fill(1);
    const bitmap = packBits(pixels, 16, 1);
    expect(bitmap.bytesPerRow).toBe(2);
    expect(Array.from(bitmap.data)).toEqual([0xff, 0xff]);
  });

  it('packs 16×1 with only the 9th pixel black as [0x00, 0x80]', () => {
    const pixels = new Uint8Array(16);
    pixels[8] = 1;
    expect(Array.from(packBits(pixels, 16, 1).data)).toEqual([0x00, 0x80]);
  });

  it('packs an 8×8 checkerboard as alternating 0xAA / 0x55 rows', () => {
    const pixels = new Uint8Array(64);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        pixels[y * 8 + x] = (x + y) % 2 === 0 ? 1 : 0;
      }
    }
    expect(Array.from(packBits(pixels, 8, 8).data)).toEqual([
      0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55,
    ]);
  });

  it('uses blackBit 0 for X4 so white pixels set bits (verified X4_05A1)', () => {
    expect(X4_BITMAP_ENCODING.blackBit).toBe(0);
    expect(X4_BITMAP_ENCODING.tsplMode).toBe(0);
    expect(X4_BITMAP_ENCODING.blackBit).not.toBe(DEFAULT_BITMAP_ENCODING.blackBit);
    const black = new Uint8Array(8).fill(1);
    const white = new Uint8Array(8).fill(0);
    expect(Array.from(packBits(black, 8, 1, X4_BITMAP_ENCODING).data)).toEqual([0x00]);
    expect(Array.from(packBits(white, 8, 1, X4_BITMAP_ENCODING).data)).toEqual([0xff]);
  });
});
