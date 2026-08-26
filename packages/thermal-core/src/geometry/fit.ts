import type { FitMode } from '../jobs/types.js';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeFitRect(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  mode: FitMode,
): Rect {
  if (srcW <= 0 || srcH <= 0 || dstW <= 0 || dstH <= 0) {
    return { x: 0, y: 0, width: dstW, height: dstH };
  }

  switch (mode) {
    case 'stretch':
      return { x: 0, y: 0, width: dstW, height: dstH };
    case 'fit': {
      const scale = Math.min(dstW / srcW, dstH / srcH);
      const width = Math.max(1, Math.round(srcW * scale));
      const height = Math.max(1, Math.round(srcH * scale));
      return {
        x: Math.round((dstW - width) / 2),
        y: Math.round((dstH - height) / 2),
        width,
        height,
      };
    }
    case 'fill': {
      const scale = Math.max(dstW / srcW, dstH / srcH);
      const width = Math.max(1, Math.round(srcW * scale));
      const height = Math.max(1, Math.round(srcH * scale));
      return {
        x: Math.round((dstW - width) / 2),
        y: Math.round((dstH - height) / 2),
        width,
        height,
      };
    }
    case 'actual':
      return {
        x: Math.round((dstW - srcW) / 2),
        y: Math.round((dstH - srcH) / 2),
        width: srcW,
        height: srcH,
      };
  }
}
