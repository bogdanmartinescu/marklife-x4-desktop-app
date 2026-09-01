import type { PrinterProfile } from '../schema.js';

/**
 * Marklife D210 — 203 DPI ESC/POS GS v 0 on OS/USB; Bluetooth SPP uses protocol 5.
 * Darkness is 0–2 (not X4 6/10/14). Media types are D210-specific, not TSPL GAP/BLINE.
 */
export const MARKLIFE_D210: PrinterProfile = {
  id: 'marklife-d210',
  displayName: 'Marklife D210',
  language: 'esc-pos',
  status: 'planned',
  dpi: 203,
  density: {
    min: 0,
    max: 2,
    default: 1,
    vendorDefault: 1,
    presets: { light: 0, normal: 1, dark: 2 },
  },
  speed: { values: [1], default: 1 },
  mediaModes: ['continuous'],
  transforms: { rotation: true, mirror: true, negative: true },
  offsets: { minXmm: -20, maxXmm: 20, minYmm: -20, maxYmm: 20 },
  labelSizes: [
    { widthMm: 210, heightMm: 297, displayName: 'A4', group: 'documents' },
    { widthMm: 148, heightMm: 210, displayName: 'A5', group: 'documents' },
    { widthMm: 176, heightMm: 250, displayName: 'B5', group: 'documents' },
    { widthMm: 215.9, heightMm: 279.4, displayName: 'Letter', group: 'documents' },
    { widthMm: 215.9, heightMm: 355.6, displayName: 'Legal', group: 'documents' },
    { widthMm: 50.8, heightMm: 100, displayName: '2-inch roll', group: 'roll' },
    { widthMm: 76.2, heightMm: 100, displayName: '3-inch roll', group: 'roll' },
    { widthMm: 101.6, heightMm: 100, displayName: '4-inch roll', group: 'roll' },
    { widthMm: 203.2, heightMm: 100, displayName: '8-inch roll', group: 'roll' },
    { widthMm: 76.2, heightMm: 50.8, displayName: '3 × 2 in', group: 'labels' },
    { widthMm: 76.2, heightMm: 101.6, displayName: '3 × 4 in', group: 'labels' },
    { widthMm: 101.6, heightMm: 50.8, displayName: '4 × 2 in', group: 'labels' },
    { widthMm: 101.6, heightMm: 76.2, displayName: '4 × 3 in', group: 'labels' },
    { widthMm: 101.6, heightMm: 101.6, displayName: '4 × 4 in', group: 'labels' },
    { widthMm: 101.6, heightMm: 152.4, displayName: '4 × 6 in', group: 'labels' },
    { widthMm: 101.6, heightMm: 170.2, displayName: '4 × 6.7 in', group: 'labels' },
    { widthMm: 101.6, heightMm: 203.2, displayName: '4 × 8 in', group: 'labels' },
    { widthMm: 101.6, heightMm: 208.3, displayName: '4 × 8.2 in', group: 'labels' },
    { widthMm: 106.7, heightMm: 157.5, displayName: '4.2 × 6.2 in', group: 'labels' },
    { widthMm: 127, heightMm: 177.8, displayName: '5 × 7 in', group: 'labels' },
    { widthMm: 203.2, heightMm: 279.4, displayName: '8 × 11 in', group: 'labels' },
  ],
};
