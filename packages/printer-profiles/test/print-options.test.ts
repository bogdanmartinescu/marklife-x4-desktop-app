import { describe, expect, it } from 'vitest';
import {
  applyProfilePrintSettings,
  labelSizesForMaxWidth,
  labelSizesForProfile,
  profileDefaultPrintSettings,
  profileColorModel,
  profileUsesMediaDimensions,
} from '../src/print-options.js';
import { MARKLIFE_D210 } from '../src/profiles/marklife-d210.js';
import { MARKLIFE_X4 } from '../src/profiles/marklife-x4.js';
import { CANON_INKJET } from '../src/profiles/canon-inkjet.js';
import { PHOMEMO_M110 } from '../src/profiles/phomemo-m110.js';

const X4_SETTINGS = {
  density: 14,
  speed: 8,
  mediaMode: 'gap' as const,
  offsetXmm: 12,
  offsetYmm: -4,
  mirrorX: true,
  mirrorY: false,
  negative: true,
  widthMm: 100,
  heightMm: 150,
};

describe('profileUsesMediaDimensions', () => {
  it('is true for TSPL (GAP/BLINE millimetres) and false for ESC/POS mode bytes', () => {
    expect(profileUsesMediaDimensions(MARKLIFE_X4)).toBe(true);
    expect(profileUsesMediaDimensions(PHOMEMO_M110)).toBe(false);
    expect(profileUsesMediaDimensions(CANON_INKJET)).toBe(false);
  });
});

describe('profileColorModel', () => {
  it('treats Canon as inkjet CMYK and thermals as mono', () => {
    expect(profileColorModel(CANON_INKJET)).toBe('inkjet-cmyk');
    expect(profileColorModel(MARKLIFE_X4)).toBe('thermal-mono');
  });
});

describe('labelSizesForMaxWidth', () => {
  it('keeps every preset when the head has no width cap', () => {
    const sizes = labelSizesForMaxWidth(undefined);
    expect(sizes.some((size) => size.widthMm === 210)).toBe(true);
    expect(sizes.some((size) => size.widthMm === 40)).toBe(true);
  });

  it('hides presets wider than the M110 48 mm head', () => {
    const sizes = labelSizesForMaxWidth(PHOMEMO_M110.maxWidthMm);
    expect(sizes.every((size) => size.widthMm <= 48)).toBe(true);
    expect(sizes.some((size) => size.widthMm === 40)).toBe(true);
    expect(sizes.some((size) => size.widthMm === 50)).toBe(false);
    expect(sizes.some((size) => size.widthMm === 210)).toBe(false);
  });
});

describe('labelSizesForProfile', () => {
  it('lists Phomemo M110 stock sizes including 20–50 mm rolls', () => {
    const keys = labelSizesForProfile(PHOMEMO_M110).map(
      (size) => `${size.widthMm}x${size.heightMm}`,
    );
    expect(keys).toContain('20x30');
    expect(keys).toContain('30x20');
    expect(keys).toContain('40x20');
    expect(keys).toContain('40x30');
    expect(keys).toContain('40x40');
    expect(keys).toContain('40x60');
    expect(keys).toContain('50x30');
    expect(keys).not.toContain('210x297');
  });

  it('lists X4 AWB-first stock and hides paper wider than the 110 mm head', () => {
    const sizes = labelSizesForProfile(MARKLIFE_X4);
    const keys = sizes.map((size) => `${size.widthMm}x${size.heightMm}`);
    expect(keys[0]).toBe('100x150');
    expect(sizes[0]?.displayName).toBe('AWB 100 × 150 mm');
    expect(keys).toContain('101.6x152.4');
    expect(keys).toContain('40x30');
    expect(keys).toContain('50x30');
    expect(keys).not.toContain('210x297');
    expect(sizes.every((size) => size.widthMm <= 110)).toBe(true);
  });
});

describe('profileDefaultPrintSettings', () => {
  it('applies X4 density 14, speed 4, gap media, and gap millimetres', () => {
    expect(profileDefaultPrintSettings(MARKLIFE_X4)).toEqual({
      density: 14,
      speed: 4,
      mediaMode: 'gap',
      widthMm: 100,
      heightMm: 150,
      gapHeightMm: 2,
      gapOffsetMm: 0,
      markHeightMm: 3,
      markOffsetMm: 0,
    });
  });

  it('defaults Canon inkjet paper to A4', () => {
    expect(profileDefaultPrintSettings(CANON_INKJET)).toMatchObject({
      mediaMode: 'continuous',
      widthMm: 210,
      heightMm: 297,
    });
  });
});

describe('applyProfilePrintSettings', () => {
  it('clamps density and speed, and snaps unknown paper to M110 stock', () => {
    const next = applyProfilePrintSettings(PHOMEMO_M110, X4_SETTINGS);
    expect(next.density).toBe(14);
    expect(next.speed).toBe(5);
    expect(next.widthMm).toBe(40);
    expect(next.heightMm).toBe(30);
    expect(next.mediaMode).toBe('gap');
  });

  it('keeps M110 50 × 30 mm stock instead of shrinking it to the 48 mm head', () => {
    const next = applyProfilePrintSettings(PHOMEMO_M110, {
      ...X4_SETTINGS,
      widthMm: 50,
      heightMm: 30,
    });
    expect(next.widthMm).toBe(50);
    expect(next.heightMm).toBe(30);
  });

  it('snaps paper wider than the X4 head to AWB 100 × 150 mm', () => {
    const next = applyProfilePrintSettings(MARKLIFE_X4, {
      ...X4_SETTINGS,
      widthMm: 210,
      heightMm: 297,
    });
    expect(next.widthMm).toBe(100);
    expect(next.heightMm).toBe(150);
    expect(next.mediaMode).toBe('gap');
  });

  it('keeps an in-range X4 small label when switching from AWB', () => {
    const next = applyProfilePrintSettings(MARKLIFE_X4, {
      ...X4_SETTINGS,
      widthMm: 40,
      heightMm: 30,
    });
    expect(next.widthMm).toBe(40);
    expect(next.heightMm).toBe(30);
  });

  it('maps X4 density onto D210 darkness 0–2 and does not keep TSPL gap', () => {
    const next = applyProfilePrintSettings(MARKLIFE_D210, X4_SETTINGS);
    expect(next.density).toBe(2);
    expect(next.mediaMode).toBe('continuous');
    expect(next.speed).toBe(1);
  });

  it('raises density to the model minimum', () => {
    const next = applyProfilePrintSettings(PHOMEMO_M110, { ...X4_SETTINGS, density: 0 });
    expect(next.density).toBe(PHOMEMO_M110.density.min);
  });

  it('falls back to the first supported media mode', () => {
    const gapOnly = {
      ...MARKLIFE_X4,
      mediaModes: ['continuous' as const],
    };
    const next = applyProfilePrintSettings(gapOnly, X4_SETTINGS);
    expect(next.mediaMode).toBe('continuous');
  });

  it('clears transforms the model does not support', () => {
    const noMirror = {
      ...MARKLIFE_X4,
      transforms: { rotation: true, mirror: false, negative: false },
    };
    const next = applyProfilePrintSettings(noMirror, X4_SETTINGS);
    expect(next.mirrorX).toBe(false);
    expect(next.mirrorY).toBe(false);
    expect(next.negative).toBe(false);
  });

  it('keeps a custom in-range X4 density instead of resetting to 14', () => {
    const next = applyProfilePrintSettings(MARKLIFE_X4, { ...X4_SETTINGS, density: 8 });
    expect(next.density).toBe(8);
  });

  it('clamps offsets to the model range', () => {
    const tight = {
      ...MARKLIFE_X4,
      offsets: { minXmm: -5, maxXmm: 5, minYmm: -5, maxYmm: 5 },
    };
    const next = applyProfilePrintSettings(tight, X4_SETTINGS);
    expect(next.offsetXmm).toBe(5);
    expect(next.offsetYmm).toBe(-4);
  });
});
