import { describe, expect, it } from 'vitest';
import { barcodeDrawMetrics } from './barcode-metrics.js';

describe('barcodeDrawMetrics', () => {
  it('fills the destination width with integer modules and quiet zones', () => {
    const metrics = barcodeDrawMetrics(320, 128, 90, true);
    expect(metrics.moduleWidth).toBeGreaterThanOrEqual(1);
    expect(metrics.quietLeft + metrics.moduleWidth * 90 + metrics.quietRight).toBe(320);
    expect(metrics.barHeight + metrics.fontSize + metrics.textMargin).toBe(128);
    expect(metrics.fontSize).toBeGreaterThan(8);
  });

  it('gives the full height to bars when the value is hidden', () => {
    const metrics = barcodeDrawMetrics(200, 80, 50, false);
    expect(metrics.fontSize).toBe(0);
    expect(metrics.textMargin).toBe(0);
    expect(metrics.barHeight).toBe(80);
    expect(metrics.quietLeft + metrics.moduleWidth * 50 + metrics.quietRight).toBe(200);
  });
});
