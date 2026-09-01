import { describe, expect, it } from 'vitest';
import { isSvgDataUrl } from './svg-source.js';

describe('isSvgDataUrl', () => {
  it('detects SVG data URLs', () => {
    expect(isSvgDataUrl('data:image/svg+xml;base64,PHN2Zy4uLg==')).toBe(true);
    expect(isSvgDataUrl('data:image/svg+xml;utf8,<svg></svg>')).toBe(true);
    expect(isSvgDataUrl('data:image/png;base64,aaa')).toBe(false);
  });
});
