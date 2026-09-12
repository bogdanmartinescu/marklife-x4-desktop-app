import type { PrinterProfile } from '../schema.js';

/**
 * Canon consumer inkjets (TS / PIXMA / G / TR) on the OS print queue.
 * Jobs are a color PNG; CUPS (or the Windows spooler) uses the vendor driver.
 */
export const CANON_INKJET: PrinterProfile = {
  id: 'canon-inkjet',
  displayName: 'Canon inkjet',
  language: 'os-document',
  colorModel: 'inkjet-cmyk',
  status: 'available',
  dpi: 300,
  density: {
    min: 1,
    max: 1,
    default: 1,
    presets: { light: 1, normal: 1, dark: 1 },
  },
  speed: { values: [1], default: 1 },
  mediaModes: ['continuous'],
  mediaDefaults: {
    mode: 'continuous',
    widthMm: 210,
    heightMm: 297,
  },
  transforms: { rotation: true, mirror: true, negative: true },
  offsets: { minXmm: -10, maxXmm: 10, minYmm: -10, maxYmm: 10 },
  maxWidthMm: 297,
  labelSizes: [
    { widthMm: 210, heightMm: 297, displayName: 'A4 210 × 297 mm', group: 'documents' },
    { widthMm: 297, heightMm: 210, displayName: 'A4 landscape 297 × 210 mm', group: 'documents' },
    { widthMm: 148, heightMm: 210, displayName: 'A5 148 × 210 mm', group: 'documents' },
    { widthMm: 215.9, heightMm: 279.4, displayName: 'Letter', group: 'documents' },
    { widthMm: 215.9, heightMm: 355.6, displayName: 'Legal', group: 'documents' },
    { widthMm: 105, heightMm: 148, displayName: 'A6 105 × 148 mm', group: 'documents' },
    { widthMm: 100, heightMm: 150, displayName: 'AWB 100 × 150 mm', group: 'shipping' },
    { widthMm: 101.6, heightMm: 152.4, displayName: '4 × 6 in', group: 'shipping' },
  ],
};
