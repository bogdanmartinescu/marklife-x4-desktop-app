import { describe, expect, it } from 'vitest';
import { interpolate, messages } from './messages.js';

describe('i18n messages', () => {
  it('has the same keys in English and Romanian', () => {
    expect(Object.keys(messages.ro).sort()).toEqual(Object.keys(messages.en).sort());
  });

  it('keeps every Romanian string non-empty', () => {
    for (const value of Object.values(messages.ro)) {
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('interpolates named placeholders', () => {
    expect(interpolate(messages.ro.loaded, { name: 'awb.pdf' })).toBe('Încărcat awb.pdf');
    expect(interpolate(messages.en.bound, { name: 'X4' })).toBe('Bound X4');
  });
});
