import { describe, expect, it } from 'vitest';
import { nextIconIndex } from './icon-grid-nav.js';

describe('nextIconIndex', () => {
  it('moves within a 4-column grid', () => {
    expect(nextIconIndex(0, 'ArrowRight', 10, 4)).toBe(1);
    expect(nextIconIndex(0, 'ArrowDown', 10, 4)).toBe(4);
    expect(nextIconIndex(4, 'ArrowUp', 10, 4)).toBe(0);
    expect(nextIconIndex(9, 'ArrowRight', 10, 4)).toBe(9);
    expect(nextIconIndex(3, 'Home', 10, 4)).toBe(0);
    expect(nextIconIndex(3, 'End', 10, 4)).toBe(9);
    expect(nextIconIndex(0, 'ArrowLeft', 10, 4)).toBe(0);
    expect(nextIconIndex(2, 'Enter', 10, 4)).toBe(2);
    expect(nextIconIndex(0, 'ArrowRight', 0, 4)).toBe(0);
  });
});
