import { describe, expect, it } from 'vitest';
import { nextModalCount } from './modal-count.js';

describe('nextModalCount', () => {
  it('tracks stacked dialogs and never goes below zero', () => {
    expect(nextModalCount(0, 1)).toBe(1);
    expect(nextModalCount(1, 1)).toBe(2);
    expect(nextModalCount(1, -1)).toBe(0);
    expect(nextModalCount(0, -1)).toBe(0);
  });
});
