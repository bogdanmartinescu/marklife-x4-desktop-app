import type { PrinterProfile } from '../schema.js';

/**
 * Phomemo M110 (and M120/M220 family) — 384-dot / 48 mm head at 203 DPI.
 * BLE GATT: service ff00, write ff02. Print language is an ESC/POS raster dialect.
 */
export const PHOMEMO_M110: PrinterProfile = {
  id: 'phomemo-m110',
  displayName: 'Phomemo M110',
  language: 'esc-pos',
  status: 'available',
  dpi: 203,
  density: {
    min: 1,
    max: 15,
    default: 15,
    presets: { light: 6, normal: 10, dark: 15 },
  },
  speed: { values: [1, 2, 3, 4, 5], default: 5 },
  mediaModes: ['continuous', 'gap', 'black-mark'],
  transforms: { rotation: true, mirror: true, negative: true },
  offsets: { minXmm: -20, maxXmm: 20, minYmm: -20, maxYmm: 20 },
  maxWidthMm: 48,
  labelSizes: [
    { widthMm: 20, heightMm: 15 },
    { widthMm: 20, heightMm: 30 },
    { widthMm: 25, heightMm: 15 },
    { widthMm: 25, heightMm: 30 },
    { widthMm: 30, heightMm: 15 },
    { widthMm: 30, heightMm: 20 },
    { widthMm: 30, heightMm: 30 },
    { widthMm: 30, heightMm: 40 },
    { widthMm: 30, heightMm: 50 },
    { widthMm: 40, heightMm: 12 },
    { widthMm: 40, heightMm: 20 },
    { widthMm: 40, heightMm: 30 },
    { widthMm: 40, heightMm: 40 },
    { widthMm: 40, heightMm: 50 },
    { widthMm: 40, heightMm: 60 },
    { widthMm: 40, heightMm: 80 },
    { widthMm: 50, heightMm: 20 },
    { widthMm: 50, heightMm: 30 },
    { widthMm: 50, heightMm: 40 },
    { widthMm: 50, heightMm: 50 },
  ],
};
