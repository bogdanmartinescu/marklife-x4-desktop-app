import { describe, expect, it } from 'vitest';
import { intrinsicSize } from './source-size.js';

describe('intrinsicSize', () => {
  it('prefers naturalWidth for decoded images', () => {
    expect(intrinsicSize({ naturalWidth: 800, naturalHeight: 1200, width: 0, height: 0 })).toEqual({
      width: 800,
      height: 1200,
    });
  });

  it('uses width/height for canvases', () => {
    expect(intrinsicSize({ width: 100, height: 150 })).toEqual({ width: 100, height: 150 });
  });
});
