import { describe, expect, it } from 'vitest';
import { getPrintIcon, iconSvgMarkup, PRINT_ICONS } from './icon-catalog.js';

describe('print icon catalog', () => {
  it('has unique ids and at least one path per icon', () => {
    const ids = PRINT_ICONS.map((icon) => icon.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(40);
    for (const icon of PRINT_ICONS) {
      expect(icon.fill.length + icon.stroke.length).toBeGreaterThan(0);
      for (const d of [...icon.fill, ...icon.stroke]) {
        expect(d.trim().length).toBeGreaterThan(4);
      }
    }
  });

  it('looks up a warning icon', () => {
    expect(getPrintIcon('warning')?.id).toBe('warning');
    expect(getPrintIcon('missing')).toBeUndefined();
  });

  it('builds SVG markup from icon paths', () => {
    const warning = getPrintIcon('warning');
    expect(warning).toBeDefined();
    if (!warning) {
      return;
    }
    const svg = iconSvgMarkup(warning);
    expect(svg).toContain('<svg');
    expect(svg).toContain('path');
  });
});
