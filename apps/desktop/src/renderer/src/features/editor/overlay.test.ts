import { describe, expect, it } from 'vitest';
import { mmToDots } from '@thermalbridge/thermal-core';
import { overlayDestRect } from './rasterize.js';
import {
  centerOverlay,
  placeOverlay,
  createArrowOverlay,
  createBarcodeOverlay,
  createCircleOverlay,
  createFieldOverlay,
  createIconOverlay,
  createImageOverlay,
  createLineOverlay,
  createQrOverlay,
  createRectOverlay,
  createTableOverlay,
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
    expect(overlayDestRect(overlay, 203, { widthMm: 100, heightMm: 150 })).toEqual({
      x: Math.round((10 / 100) * mmToDots(100, 203)),
      y: Math.round((20 / 150) * mmToDots(150, 203)),
      width:
        Math.round((50 / 100) * mmToDots(100, 203)) - Math.round((10 / 100) * mmToDots(100, 203)),
      height:
        Math.round((28 / 150) * mmToDots(150, 203)) - Math.round((20 / 150) * mmToDots(150, 203)),
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

  it('creates circle, arrow, icon, table, and field overlays', () => {
    const circle = createCircleOverlay(40, 30);
    const arrow = createArrowOverlay(40, 30);
    const icon = createIconOverlay(40, 30, 'warning');
    const table = createTableOverlay(40, 30);
    const field = createFieldOverlay(40, 30);
    expect(circle.kind).toBe('circle');
    expect(circle.widthMm).toBe(circle.heightMm);
    expect(arrow.kind).toBe('arrow');
    expect(icon.kind).toBe('icon');
    expect(icon.iconId).toBe('warning');
    expect(table.kind).toBe('table');
    expect(table.tableRows).toBe(2);
    expect(table.tableCols).toBe(2);
    expect(table.text).toContain('\t');
    expect(field.kind).toBe('field');
    expect(field.fieldKind).toBe('date');
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

  it('applies exact millimetre placement and clamps to the label', () => {
    const overlay = createRectOverlay(40, 30);
    overlay.xMm = 2;
    overlay.yMm = 3;
    overlay.widthMm = 10;
    overlay.heightMm = 8;
    expect(placeOverlay(overlay, { xMm: 5, yMm: 6, widthMm: 12, heightMm: 9 }, 40, 30)).toEqual({
      xMm: 5,
      yMm: 6,
      widthMm: 12,
      heightMm: 9,
    });
    expect(placeOverlay(overlay, { widthMm: 80, heightMm: 80, xMm: 10, yMm: 10 }, 40, 30)).toEqual({
      xMm: 0,
      yMm: 0,
      widthMm: 40,
      heightMm: 30,
    });
  });

  it('keeps a QR code square when width or height is set', () => {
    const qr = createQrOverlay(40, 30);
    expect(placeOverlay(qr, { widthMm: 18 }, 40, 30)).toMatchObject({ widthMm: 18, heightMm: 18 });
    expect(placeOverlay(qr, { heightMm: 12 }, 40, 30)).toMatchObject({ widthMm: 12, heightMm: 12 });
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
