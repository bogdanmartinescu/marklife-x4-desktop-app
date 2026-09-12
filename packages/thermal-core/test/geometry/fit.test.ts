import { describe, expect, it } from 'vitest';
import { computeFitRect } from '../../src/geometry/fit.js';

describe('computeFitRect', () => {
  it('centers a 2:1 source inside a square with fit', () => {
    expect(computeFitRect(200, 100, 100, 100, 'fit')).toEqual({
      x: 0,
      y: 25,
      width: 100,
      height: 50,
    });
  });

  it('overflows the destination on the short axis with fill', () => {
    expect(computeFitRect(200, 100, 100, 100, 'fill')).toEqual({
      x: -50,
      y: 0,
      width: 200,
      height: 100,
    });
  });

  it('stretches to the destination box', () => {
    expect(computeFitRect(10, 20, 100, 50, 'stretch')).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    });
  });

  it('keeps source pixels for actual size', () => {
    expect(computeFitRect(40, 20, 100, 80, 'actual')).toEqual({
      x: 30,
      y: 30,
      width: 40,
      height: 20,
    });
  });

  it('returns the destination box when a side is zero', () => {
    expect(computeFitRect(0, 10, 80, 60, 'fit')).toEqual({
      x: 0,
      y: 0,
      width: 80,
      height: 60,
    });
  });
});
