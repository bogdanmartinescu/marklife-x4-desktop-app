import type { PrinterProfile } from '../schema.js';

export const MARKLIFE_X4: PrinterProfile = {
  id: 'marklife-x4',
  displayName: 'Marklife X4',
  language: 'tspl',
  status: 'available',
  dpi: 203,
  density: {
    min: 0,
    max: 15,
    default: 14,
    vendorDefault: 10,
    presets: { light: 6, normal: 10, dark: 14 },
  },
  speed: { values: [1, 2, 3, 4, 5, 6, 7, 8], default: 4 },
  mediaModes: ['continuous', 'gap', 'black-mark'],
  transforms: { rotation: true, mirror: true, negative: true },
  offsets: { minXmm: -20, maxXmm: 20, minYmm: -20, maxYmm: 20 },
};
