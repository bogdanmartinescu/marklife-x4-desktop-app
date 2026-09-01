import { describe, expect, it } from 'vitest';
import {
  PREVIEW_CHROME_INSETS,
  PREVIEW_ZOOM_DEFAULT,
  PREVIEW_ZOOM_MAX,
  PREVIEW_ZOOM_MIN,
  clampPreviewZoom,
  nextWellSize,
  previewLabelSize,
  previewDocumentSize,
  previewStageSize,
  previewVisibleWell,
} from './preview-zoom.js';

describe('clampPreviewZoom', () => {
  it('allows the full 0–200% range', () => {
    expect(PREVIEW_ZOOM_MIN).toBe(0);
    expect(PREVIEW_ZOOM_MAX).toBe(200);
    expect(PREVIEW_ZOOM_DEFAULT).toBe(100);
    expect(clampPreviewZoom(0)).toBe(0);
    expect(clampPreviewZoom(200)).toBe(200);
  });

  it('rounds and clamps out-of-range values', () => {
    expect(clampPreviewZoom(-10)).toBe(0);
    expect(clampPreviewZoom(250)).toBe(200);
    expect(clampPreviewZoom(87.4)).toBe(87);
    expect(clampPreviewZoom(Number.NaN)).toBe(100);
  });
});

describe('previewLabelSize', () => {
  it('fills the well at 100% for a 100×150 mm AWB', () => {
    const size = previewLabelSize({
      wellWidth: 360,
      wellHeight: 540,
      widthMm: 100,
      heightMm: 150,
      zoomPercent: 100,
    });
    expect(size.width).toBe(360);
    expect(size.height).toBe(540);
  });

  it('scales from the fit size, not a fixed pixel cap', () => {
    const at100 = previewLabelSize({
      wellWidth: 400,
      wellHeight: 700,
      widthMm: 100,
      heightMm: 150,
      zoomPercent: 100,
    });
    const at200 = previewLabelSize({
      wellWidth: 400,
      wellHeight: 700,
      widthMm: 100,
      heightMm: 150,
      zoomPercent: 200,
    });
    const at50 = previewLabelSize({
      wellWidth: 400,
      wellHeight: 700,
      widthMm: 100,
      heightMm: 150,
      zoomPercent: 50,
    });
    const at0 = previewLabelSize({
      wellWidth: 400,
      wellHeight: 700,
      widthMm: 100,
      heightMm: 150,
      zoomPercent: 0,
    });

    expect(at100.width).toBeGreaterThan(280);
    expect(at200.width).toBeCloseTo(at100.width * 2);
    expect(at200.height).toBeCloseTo(at100.height * 2);
    expect(at50.width).toBeCloseTo(at100.width * 0.5);
    expect(at0).toEqual({ width: 0, height: 0 });
  });

  it('fits the shorter well axis so the label is never cropped at 100%', () => {
    const size = previewLabelSize({
      wellWidth: 500,
      wellHeight: 400,
      widthMm: 100,
      heightMm: 150,
      zoomPercent: 100,
    });
    expect(size.height).toBe(400);
    expect(size.width).toBeCloseTo(400 * (100 / 150));
  });

  it('returns an empty size until the well is measured', () => {
    expect(
      previewLabelSize({
        wellWidth: 0,
        wellHeight: 480,
        widthMm: 100,
        heightMm: 150,
        zoomPercent: 100,
      }),
    ).toEqual({ width: 0, height: 0 });
  });
});

describe('nextWellSize', () => {
  it('ignores subpixel noise that would retrigger layout', () => {
    expect(nextWellSize({ width: 500, height: 700 }, 500.4, 699.6)).toEqual({
      width: 500,
      height: 700,
    });
  });

  it('returns a new size only when the rounded box actually changed', () => {
    expect(nextWellSize({ width: 500, height: 700 }, 480, 700)).toEqual({
      width: 480,
      height: 700,
    });
  });
});

describe('previewStageSize', () => {
  it('uses the label size when zoomed in instead of fighting the well', () => {
    expect(
      previewStageSize({
        wellWidth: 400,
        wellHeight: 600,
        labelWidth: 800,
        labelHeight: 1200,
        padding: 32,
      }),
    ).toEqual({ width: 832, height: 1232 });
  });
});

describe('previewVisibleWell', () => {
  it('uses a fit factor instead of subtracting side chrome', () => {
    expect(PREVIEW_CHROME_INSETS.left).toBe(0);
    expect(PREVIEW_CHROME_INSETS.right).toBe(0);
    expect(previewVisibleWell(1000, 800)).toEqual({
      width: Math.floor(1000 * PREVIEW_CHROME_INSETS.fit),
      height: Math.floor(800 * PREVIEW_CHROME_INSETS.fit),
    });
  });

  it('keeps A4 inside the well at 100% zoom', () => {
    const well = previewVisibleWell(1400, 900);
    const size = previewLabelSize({
      wellWidth: well.width,
      wellHeight: well.height,
      widthMm: 210,
      heightMm: 297,
      zoomPercent: 100,
    });
    expect(size.height).toBeLessThanOrEqual(well.height);
    expect(size.width).toBeLessThan(well.width + 0.01);
    expect(size.height).toBeGreaterThan(500);
  });

  it('returns empty until the well is measured', () => {
    expect(previewVisibleWell(0, 800)).toEqual({ width: 0, height: 0 });
  });
});

describe('previewDocumentSize', () => {
  it('stacks pages vertically so extra pages scroll on the grid', () => {
    expect(
      previewDocumentSize({
        wellWidth: 400,
        wellHeight: 500,
        pageWidth: 200,
        pageHeight: 300,
        pageCount: 2,
        gutter: 48,
        padding: 32,
        footer: 40,
      }),
    ).toEqual({ width: 400, height: 752 });
  });
});
