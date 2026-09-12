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

  it('inverts the sample AWB for Marklife X4 so firmware polarity matches live prints', () => {
    const source = buildSampleAwb(40, 60, 203);
    const prepared = prepareTestPageImage('marklife-x4', 40, 60, 203);
    expect(grayAt(prepared, 0, 0)).toBe(0);
    expect(grayAt(source, 0, 0)).toBe(255);
    expect(prepareTestPageImage('phomemo-m110', 40, 60, 203).data).toEqual(source.data);
  });
});
