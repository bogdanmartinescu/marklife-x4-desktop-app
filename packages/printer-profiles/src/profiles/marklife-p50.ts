import type { PrinterProfile } from '../schema.js';

/**
 * Planned P50 profile. Android routes this family through protocol 3.
 * Print language for OS-queue is unknown; do not guess TSPL or ESC/POS.
 */
export const MARKLIFE_P50: PrinterProfile = {
  id: 'marklife-p50',
  displayName: 'Marklife P50',
  language: 'unknown',
  status: 'planned',
  dpi: 203,
  density: { min: 0, max: 15, default: 10, presets: { light: 6, normal: 10, dark: 15 } },
  speed: { values: [1, 2, 3, 4, 5, 6, 7, 8], default: 4 },
  mediaModes: ['continuous', 'gap', 'black-mark'],
  transforms: { rotation: true, mirror: true, negative: true },
  offsets: { minXmm: -20, maxXmm: 20, minYmm: -20, maxYmm: 20 },
};
