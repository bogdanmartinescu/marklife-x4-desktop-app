import { describe, expect, it } from 'vitest';
import { mmToDots } from '@thermalbridge/thermal-core';
import { overlayDestRect } from './rasterize.js';
import {
  centerOverlay,
  createBarcodeOverlay,
  createImageOverlay,
  createLineOverlay,
  createQrOverlay,
  createRectOverlay,
  createTextOverlay,
  duplicateOverlay,
  moveOverlayZ,
} from './overlay.js';

describe('overlayDestRect', () => {
  it('converts millimetres to printer dots', () => {
    const overlay = createTextOverlay(100, 150);
    overlay.xMm = 10;
    overlay.yMm = 20;
    overlay.widthMm = 40;
    overlay.heightMm = 8;
    expect(overlayDestRect(overlay, 203)).toEqual({
      x: mmToDots(10, 203),
      y: mmToDots(20, 203),
      width: mmToDots(40, 203),
      height: mmToDots(8, 203),
    });
  });
});

describe('overlay factories', () => {
  it('places new overlays on the label', () => {
    const text = createTextOverlay(100, 150);
    const rect = createRectOverlay(100, 150);
    expect(text.xMm).toBeGreaterThanOrEqual(0);
    expect(text.xMm + text.widthMm).toBeLessThanOrEqual(100);
    expect(rect.kind).toBe('rect');
  });

  it('creates QR, barcode, line, and image overlays', () => {
    const qr = createQrOverlay(100, 150);
    const barcode = createBarcodeOverlay(100, 150);
    const line = createLineOverlay(100, 150);
    const image = createImageOverlay(100, 150, 'data:image/png;base64,aa', 200, 100);
    expect(qr.kind).toBe('qr');
    expect(qr.content.length).toBeGreaterThan(0);
    expect(qr.xMm + qr.widthMm).toBeLessThanOrEqual(100);
    expect(barcode.kind).toBe('barcode');
    expect(barcode.barcodeFormat).toBe('CODE128');
    expect(line.kind).toBe('line');
    expect(line.widthMm).toBeGreaterThan(0);
    expect(image.kind).toBe('image');
    expect(image.src).toContain('data:image');
    expect(image.widthMm / image.heightMm).toBeCloseTo(2, 5);
  });

  it('duplicates an overlay with a new id and offset', () => {
    const text = createTextOverlay(100, 150);
    const copy = duplicateOverlay(text);
    expect(copy.id).not.toBe(text.id);
    expect(copy.kind).toBe('text');
    expect(copy.text).toBe(text.text);
    expect(copy.xMm).toBe(text.xMm + 4);
    expect(copy.yMm).toBe(text.yMm + 4);
  });

  it('centers an overlay on the label', () => {
    const overlay = createRectOverlay(100, 150);
    overlay.widthMm = 20;
    overlay.heightMm = 10;
    expect(centerOverlay(overlay, 100, 150)).toEqual({ xMm: 40, yMm: 70 });
  });

  it('moves overlay z-order', () => {
    const first = createTextOverlay(100, 150);
    const second = createRectOverlay(100, 150);
    const broughtForward = moveOverlayZ([first, second], first.id, 'up');
    expect(broughtForward.map((item) => item.id)).toEqual([second.id, first.id]);
    const sentBack = moveOverlayZ(broughtForward, first.id, 'down');
    expect(sentBack.map((item) => item.id)).toEqual([first.id, second.id]);
  });
});
