import { describe, expect, it } from 'vitest';
import { buildSampleAwb, prepareTestPageImage } from './sample-awb.js';

function grayAt(image: { width: number; data: Uint8ClampedArray }, x: number, y: number): number {
  return image.data[(y * image.width + x) * 4] ?? 255;
}

function inkFraction(image: { data: Uint8ClampedArray }): number {
  let ink = 0;
  for (let i = 0; i < image.data.length; i += 4) {
    if ((image.data[i] ?? 255) < 128) {
      ink += 1;
    }
  }
  return ink / (image.data.length / 4);
}

describe('buildSampleAwb', () => {
  it('draws a mostly white AWB with black ink, not a solid black label', () => {
    const image = buildSampleAwb(100, 150, 203);
    expect(image.width).toBe(799);
    expect(image.height).toBe(1199);
    expect(grayAt(image, 0, 0)).toBe(255);
    expect(inkFraction(image)).toBeGreaterThan(0.02);
    expect(inkFraction(image)).toBeLessThan(0.25);
  });

  it('inverts the sample AWB for Marklife X4 so firmware polarity matches live prints', { timeout: 15_000 }, () => {
    const source = buildSampleAwb(40, 60, 203);
    const prepared = prepareTestPageImage('marklife-x4', 40, 60, 203);
    expect(grayAt(prepared, 0, 0)).toBe(0);  // inverted: top-left is black
    expect(grayAt(source, 0, 0)).toBe(255);  // original: top-left is white

    // Verify non-X4 profiles pass through unchanged.
    // Use a small image (10×15 mm → 80×120 px) to keep the byte-level
    // comparison fast on slow CI runners.
    const small = buildSampleAwb(10, 15, 203);
    expect(prepareTestPageImage('phomemo-m110', 10, 15, 203).data).toEqual(small.data);
  });
});
