import { describe, expect, it } from 'vitest';
import { toggleFontStyle } from './font-style.js';

describe('toggleFontStyle', () => {
  it('adds and removes bold and italic independently', () => {
    expect(toggleFontStyle('', 'bold')).toBe('bold');
    expect(toggleFontStyle('bold', 'italic')).toBe('bold italic');
    expect(toggleFontStyle('bold italic', 'bold')).toBe('italic');
    expect(toggleFontStyle('italic', 'italic')).toBe('');
  });
});
