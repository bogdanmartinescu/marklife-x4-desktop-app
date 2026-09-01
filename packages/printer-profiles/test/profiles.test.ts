import { describe, expect, it } from 'vitest';
import { GENERIC_TSPL_203 } from '../src/profiles/generic-tspl-203.js';
import { MARKLIFE_D210 } from '../src/profiles/marklife-d210.js';
import { MARKLIFE_P50 } from '../src/profiles/marklife-p50.js';
import { MARKLIFE_X4 } from '../src/profiles/marklife-x4.js';
import { PHOMEMO_M110 } from '../src/profiles/phomemo-m110.js';
import {
  DEFAULT_LABEL_SIZES,
  LABEL_MM_MAX,
  clampLabelMm,
  labelSizeRecord,
  parseLabelSizeKey,
  printableWidthMm,
  PrinterProfileSchema,
} from '../src/schema.js';

describe('printer profiles', () => {
  it('validates Marklife X4 against the profile schema', () => {
    const parsed = PrinterProfileSchema.parse(MARKLIFE_X4);
    expect(parsed.id).toBe('marklife-x4');
    expect(parsed.language).toBe('tspl');
    expect(parsed.dpi).toBe(203);
  });

  it('uses density.default === 14 as the app UI default for Marklife X4', () => {
    expect(MARKLIFE_X4.density.default).toBe(14);
  });

  it('records vendor density default 10 separately from the app default', () => {
    expect(MARKLIFE_X4.density.vendorDefault).toBe(10);
    expect(MARKLIFE_X4.density.presets.light).toBe(6);
    expect(MARKLIFE_X4.density.presets.normal).toBe(10);
    expect(MARKLIFE_X4.density.presets.dark).toBe(14);
  });

  it('defaults the AWB 100 × 150 mm size as a preset', () => {
    expect(DEFAULT_LABEL_SIZES).toContainEqual({
      widthMm: 100,
      heightMm: 150,
      displayName: 'AWB 100 × 150 mm',
    });
  });

  it('includes small label sizes besides AWB 100 × 150 mm', () => {
    const keys = DEFAULT_LABEL_SIZES.map((size) => `${size.widthMm}x${size.heightMm}`);
    expect(keys).toContain('50x30');
    expect(keys).toContain('40x12');
    expect(keys).toContain('40x20');
    expect(keys).toContain('40x30');
    expect(keys).toContain('20x30');
    expect(keys).toContain('30x20');
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('includes paper sizes up to A4', () => {
    const keys = DEFAULT_LABEL_SIZES.map((size) => `${size.widthMm}x${size.heightMm}`);
    expect(keys).toContain('148x210');
    expect(keys).toContain('210x297');
    expect(keys).toContain('297x210');
    expect(LABEL_MM_MAX).toBe(356);
    expect(clampLabelMm(297)).toBe(297);
    expect(clampLabelMm(400)).toBe(356);
  });

  it('parses label size keys used by the size selector', () => {
    expect(parseLabelSizeKey('40x12')).toEqual({ widthMm: 40, heightMm: 12 });
    expect(parseLabelSizeKey('101.6x152.4')).toEqual({ widthMm: 101.6, heightMm: 152.4 });
    expect(parseLabelSizeKey('AWB')).toBeUndefined();
  });

  it('resolves a display name for a chosen label size', () => {
    expect(labelSizeRecord(210, 297).displayName).toBe('A4 210 × 297 mm');
    expect(labelSizeRecord(80, 80).displayName).toBe('80 × 80 mm');
  });

  it('validates the generic 203 DPI TSPL profile', () => {
    const parsed = PrinterProfileSchema.parse(GENERIC_TSPL_203);
    expect(parsed.id).toBe('generic-tspl-203');
    expect(parsed.dpi).toBe(203);
    expect(parsed.status).toBe('available');
  });

  it('registers Marklife D210 as a planned ESC/POS profile, not a TSPL clone of X4', () => {
    const parsed = PrinterProfileSchema.parse(MARKLIFE_D210);
    expect(parsed.id).toBe('marklife-d210');
    expect(parsed.displayName).toBe('Marklife D210');
    expect(parsed.language).toBe('esc-pos');
    expect(parsed.dpi).toBe(203);
    expect(parsed.status).toBe('planned');
    expect(parsed.density.min).toBe(0);
    expect(parsed.density.max).toBe(2);
    expect(parsed.density.default).toBe(1);
    expect(parsed.density.vendorDefault).toBe(1);
    expect(parsed.density.presets).toEqual({ light: 0, normal: 1, dark: 2 });
    expect(parsed.speed.values).toEqual([1]);
    expect(parsed.labelSizes?.some((size) => size.displayName === 'A4')).toBe(true);
    expect(parsed.labelSizes?.some((size) => size.displayName === '4 × 6 in')).toBe(true);
  });

  it('registers Marklife P50 as a planned profile without guessing a print language', () => {
    const parsed = PrinterProfileSchema.parse(MARKLIFE_P50);
    expect(parsed.id).toBe('marklife-p50');
    expect(parsed.displayName).toBe('Marklife P50');
    expect(parsed.language).toBe('unknown');
    expect(parsed.status).toBe('planned');
  });

  it('registers Phomemo M110 as an available ESC/POS BLE profile', () => {
    const parsed = PrinterProfileSchema.parse(PHOMEMO_M110);
    expect(parsed.id).toBe('phomemo-m110');
    expect(parsed.displayName).toBe('Phomemo M110');
    expect(parsed.language).toBe('esc-pos');
    expect(parsed.dpi).toBe(203);
    expect(parsed.status).toBe('available');
    expect(parsed.maxWidthMm).toBe(48);
    expect(parsed.labelSizes?.some((size) => size.widthMm === 50 && size.heightMm === 30)).toBe(
      true,
    );
  });

  it('clamps label width to the printer head when a profile sets maxWidthMm', () => {
    expect(printableWidthMm(100, 48)).toBe(48);
    expect(printableWidthMm(40, 48)).toBe(40);
    expect(printableWidthMm(50, undefined)).toBe(50);
  });
});
