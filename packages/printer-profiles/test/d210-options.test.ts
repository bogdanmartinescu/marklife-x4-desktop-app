import { describe, expect, it } from 'vitest';
import {
  applyD210PrintSettings,
  clampD210FeedMm,
  DEFAULT_D210_PRINT_SETTINGS,
  isD210ContinuousMedia,
  isD210LabelMedia,
} from '../src/d210-options.js';
import { labelSizesForProfile } from '../src/print-options.js';
import { MARKLIFE_D210 } from '../src/profiles/marklife-d210.js';

describe('D210 settings', () => {
  it('keeps locate-before-page for label stock and hides it conceptually on continuous', () => {
    expect(isD210LabelMedia('label')).toBe(true);
    expect(isD210LabelMedia('folded-with-marks')).toBe(true);
    expect(isD210LabelMedia('label-with-marks')).toBe(true);
    expect(isD210LabelMedia('continuous')).toBe(false);
    expect(isD210ContinuousMedia('continuous')).toBe(true);
    expect(isD210ContinuousMedia('tattoo')).toBe(false);
  });

  it('clamps feed distances to the driver 0–32 mm range', () => {
    expect(clampD210FeedMm(-4)).toBe(0);
    expect(clampD210FeedMm(12)).toBe(12);
    expect(clampD210FeedMm(40)).toBe(32);
  });

  it('falls back to vendor defaults for unknown media or processing', () => {
    const next = applyD210PrintSettings({
      ...DEFAULT_D210_PRINT_SETTINGS,
      mediaType: 'gap' as unknown as typeof DEFAULT_D210_PRINT_SETTINGS.mediaType,
      processing: 'auto' as unknown as typeof DEFAULT_D210_PRINT_SETTINGS.processing,
      documentEndMm: 99,
    });
    expect(next.mediaType).toBe('label');
    expect(next.processing).toBe('none');
    expect(next.documentEndMm).toBe(32);
  });
});

describe('D210 document sizes', () => {
  it('lists driver documents, rolls, and label/photo formats', () => {
    const sizes = labelSizesForProfile(MARKLIFE_D210);
    const keys = sizes.map((size) => `${size.widthMm}x${size.heightMm}`);
    expect(keys).toContain('210x297');
    expect(keys).toContain('148x210');
    expect(keys).toContain('215.9x279.4');
    expect(keys).toContain('50.8x100');
    expect(keys).toContain('101.6x152.4');
    expect(keys).toContain('127x177.8');
    expect(keys).not.toContain('40x30');
    expect(sizes.some((size) => size.group === 'documents')).toBe(true);
    expect(sizes.some((size) => size.group === 'roll')).toBe(true);
    expect(sizes.some((size) => size.group === 'labels')).toBe(true);
  });
});
