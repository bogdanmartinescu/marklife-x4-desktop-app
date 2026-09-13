import { describe, expect, it } from 'vitest';
import { asFitMode, asLabelSize, asLocale, asScreen, asString } from './command-payloads.js';

describe('command payloads', () => {
  it('accepts known ids and rejects unknowns', () => {
    expect(asString('cups:x4')).toBe('cups:x4');
    expect(asString('')).toBeNull();
    expect(asScreen('setup')).toBe('setup');
    expect(asScreen('nope')).toBeNull();
    expect(asLocale('ro')).toBe('ro');
    expect(asLocale('de')).toBeNull();
    expect(asFitMode('fill')).toBe('fill');
    expect(asFitMode('cover')).toBeNull();
    expect(asLabelSize({ widthMm: 40, heightMm: 30 })).toEqual({ widthMm: 40, heightMm: 30 });
    expect(asLabelSize({ widthMm: 0, heightMm: 30 })).toBeNull();
    expect(asLabelSize(null)).toBeNull();
    expect(asLabelSize({ widthMm: 40 })).toBeNull();
  });
});
