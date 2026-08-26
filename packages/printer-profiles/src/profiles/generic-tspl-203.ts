import type { PrinterProfile } from '../schema.js';

export const GENERIC_TSPL_203: PrinterProfile = {
  id: 'generic-tspl-203',
  displayName: 'Generic TSPL 203 DPI',
  language: 'tspl',
  status: 'available',
  dpi: 203,
  density: { min: 0, max: 15, default: 10, presets: { light: 6, normal: 10, dark: 15 } },
  speed: { values: [1, 2, 3, 4, 5, 6, 7, 8], default: 4 },
  mediaModes: ['continuous', 'gap', 'black-mark'],
  transforms: { rotation: true, mirror: true, negative: true },
  offsets: { minXmm: -20, maxXmm: 20, minYmm: -20, maxYmm: 20 },
};
