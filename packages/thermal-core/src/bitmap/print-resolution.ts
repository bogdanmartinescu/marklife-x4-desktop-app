import { mmToDots } from '../geometry/units.js';

export function isBelowPrintResolution(options: {
  sourceWidth: number;
  sourceHeight: number;
  widthMm: number;
  heightMm: number;
  dpi: number;
}): boolean {
  const needW = mmToDots(options.widthMm, options.dpi);
  const needH = mmToDots(options.heightMm, options.dpi);
  if (needW <= 0 || needH <= 0) {
    return false;
  }
  return options.sourceWidth < needW * 0.9 || options.sourceHeight < needH * 0.9;
}
