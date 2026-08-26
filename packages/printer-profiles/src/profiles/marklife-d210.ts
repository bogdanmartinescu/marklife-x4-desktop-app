import type { PrinterProfile } from '../schema.js';

/**
 * Planned D210 profile. OS/USB uses ESC/POS GS v 0; Bluetooth SPP uses protocol 5.
 * Density/speed ranges are UI placeholders until a physical D210 is verified.
 * Do not treat this as a TSPL clone of X4.
 */
export const MARKLIFE_D210: PrinterProfile = {
  id: 'marklife-d210',
  displayName: 'Marklife D210',
  language: 'esc-pos',
  status: 'planned',
  dpi: 203,
  density: { min: 0, max: 15, default: 10, presets: { light: 6, normal: 10, dark: 15 } },
  speed: { values: [1, 2, 3, 4, 5, 6, 7, 8], default: 4 },
  mediaModes: ['continuous', 'gap', 'black-mark'],
  transforms: { rotation: true, mirror: true, negative: true },
  offsets: { minXmm: -20, maxXmm: 20, minYmm: -20, maxYmm: 20 },
};
