import { describe, expect, it } from 'vitest';
import { mirrorX, mirrorY } from '../../src/bitmap/mirror.js';
import { negateThreshold } from '../../src/bitmap/negative.js';
import { resizeNearest } from '../../src/bitmap/resize.js';
import { rotate180, rotate270, rotate90, rotateBy } from '../../src/bitmap/rotate.js';

describe('rotate', () => {
  it('rotates a 2×1 row to a 1×2 column', () => {
    const rotated = rotate90(new Uint8Array([10, 20]), 2, 1);
    expect(rotated.width).toBe(1);
    expect(rotated.height).toBe(2);
    expect(Array.from(rotated.data)).toEqual([10, 20]);
  });

  it('rotate180 flips both axes', () => {
    expect(Array.from(rotate180(new Uint8Array([1, 2, 3, 4]), 2, 2).data)).toEqual([4, 3, 2, 1]);
  });

  it('rotate270 is the inverse of rotate90', () => {
    const source = new Uint8Array([1, 2, 3, 4, 5, 6]);
    const once = rotate90(source, 3, 2);
    const back = rotate270(once.data, once.width, once.height);
    expect(Array.from(back.data)).toEqual(Array.from(source));
    expect(back.width).toBe(3);
    expect(back.height).toBe(2);
  });

  it('rotateBy 0 returns the same buffer', () => {
    const source = new Uint8Array([9]);
    const rotated = rotateBy(source, 1, 1, 0);
    expect(rotated.data).toBe(source);
  });
});

describe('mirror', () => {
  it('mirrors a row left-to-right', () => {
    expect(Array.from(mirrorX(new Uint8Array([1, 2, 3]), 3, 1))).toEqual([3, 2, 1]);
  });

  it('mirrors a column top-to-bottom', () => {
    expect(Array.from(mirrorY(new Uint8Array([1, 2, 3]), 1, 3))).toEqual([3, 2, 1]);
  });
});

describe('resizeNearest', () => {
  it('duplicates a pixel when scaling up', () => {
    expect(Array.from(resizeNearest(new Uint8Array([7]), 1, 1, 2, 2))).toEqual([7, 7, 7, 7]);
  });

  it('rejects a zero destination', () => {
    expect(() => resizeNearest(new Uint8Array([1]), 1, 1, 0, 1)).toThrow(/destination/);
  });
});

describe('negateThreshold', () => {
  it('swaps 0 and 1 bits', () => {
    expect(Array.from(negateThreshold(new Uint8Array([0, 1, 0])))).toEqual([1, 0, 1]);
  });
});
