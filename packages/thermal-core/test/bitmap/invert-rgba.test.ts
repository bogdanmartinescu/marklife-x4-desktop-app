import { describe, expect, it } from 'vitest';
import { invertRgba } from '../../src/bitmap/invert-rgba.js';

describe('invertRgba', () => {
  it('swaps black and white RGB and leaves alpha unchanged', () => {
    const input = new Uint8Array([0, 0, 0, 255, 255, 255, 255, 128]);
    expect(Array.from(invertRgba(input))).toEqual([255, 255, 255, 255, 0, 0, 0, 128]);
  });
});
