import {
  computeFitRect,
  dotsToMm,
  mmToDots,
  type FitMode,
  type Rect,
} from '@thermalbridge/thermal-core';

export interface ContentBox {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

export const CONTENT_SCALE_MIN = 20;
export const CONTENT_SCALE_MAX = 400;
export const CONTENT_MIN_WIDTH_MM = 8;
export const CONTENT_MIN_HEIGHT_MM = 8;

export function lockAspectForFitMode(mode: FitMode): boolean {
  return mode !== 'stretch';
}

export function boxFromFit(options: {
  sourceWidthPx: number;
  sourceHeightPx: number;
  labelWidthMm: number;
  labelHeightMm: number;
  dpi: number;
  fitMode: FitMode;
}): ContentBox {
  const dstW = mmToDots(options.labelWidthMm, options.dpi);
  const dstH = mmToDots(options.labelHeightMm, options.dpi);
  const rect = computeFitRect(
    options.sourceWidthPx,
    options.sourceHeightPx,
    dstW,
    dstH,
    options.fitMode,
  );
  return {
    xMm: dotsToMm(rect.x, options.dpi),
    yMm: dotsToMm(rect.y, options.dpi),
    widthMm: dotsToMm(rect.width, options.dpi),
    heightMm: dotsToMm(rect.height, options.dpi),
  };
}

export function moveBox(box: ContentBox, dxMm: number, dyMm: number): ContentBox {
  return {
    ...box,
    xMm: box.xMm + dxMm,
    yMm: box.yMm + dyMm,
  };
}

function handlePoint(box: ContentBox, handle: ResizeHandle): { x: number; y: number } {
  switch (handle) {
    case 'nw':
      return { x: box.xMm, y: box.yMm };
    case 'ne':
      return { x: box.xMm + box.widthMm, y: box.yMm };
    case 'sw':
      return { x: box.xMm, y: box.yMm + box.heightMm };
    case 'se':
      return { x: box.xMm + box.widthMm, y: box.yMm + box.heightMm };
  }
}

function oppositeHandle(handle: ResizeHandle): ResizeHandle {
  switch (handle) {
    case 'nw':
      return 'se';
    case 'ne':
      return 'sw';
    case 'sw':
      return 'ne';
    case 'se':
      return 'nw';
  }
}

function expectedSigns(handle: ResizeHandle): { w: 1 | -1; h: 1 | -1 } {
  switch (handle) {
    case 'se':
      return { w: 1, h: 1 };
    case 'nw':
      return { w: -1, h: -1 };
    case 'ne':
      return { w: 1, h: -1 };
    case 'sw':
      return { w: -1, h: 1 };
  }
}

function boxFromOrigin(
  handle: ResizeHandle,
  origin: { x: number; y: number },
  widthMm: number,
  heightMm: number,
): ContentBox {
  switch (handle) {
    case 'se':
      return { xMm: origin.x, yMm: origin.y, widthMm, heightMm };
    case 'nw':
      return { xMm: origin.x - widthMm, yMm: origin.y - heightMm, widthMm, heightMm };
    case 'ne':
      return { xMm: origin.x, yMm: origin.y - heightMm, widthMm, heightMm };
    case 'sw':
      return { xMm: origin.x - widthMm, yMm: origin.y, widthMm, heightMm };
  }
}

function absFromOrigin(
  signed: number,
  expectedSign: 1 | -1,
  minMm: number,
): number {
  if (Math.sign(signed) !== expectedSign) {
    return minMm;
  }
  return Math.max(minMm, Math.abs(signed));
}

export function resizeBox(options: {
  box: ContentBox;
  handle: ResizeHandle;
  dxMm: number;
  dyMm: number;
  lockAspect: boolean;
  minWidthMm: number;
  minHeightMm: number;
}): ContentBox {
  const origin = handlePoint(options.box, oppositeHandle(options.handle));
  const start = handlePoint(options.box, options.handle);
  let widthMm = start.x + options.dxMm - origin.x;
  let heightMm = start.y + options.dyMm - origin.y;
  const signs = expectedSigns(options.handle);

  if (options.lockAspect && options.box.widthMm > 0 && options.box.heightMm > 0) {
    const scale = Math.max(
      Math.abs(widthMm) / options.box.widthMm,
      Math.abs(heightMm) / options.box.heightMm,
      options.minWidthMm / options.box.widthMm,
      options.minHeightMm / options.box.heightMm,
    );
    widthMm = signs.w * options.box.widthMm * scale;
    heightMm = signs.h * options.box.heightMm * scale;
  }

  return boxFromOrigin(
    options.handle,
    origin,
    absFromOrigin(widthMm, signs.w, options.minWidthMm),
    absFromOrigin(heightMm, signs.h, options.minHeightMm),
  );
}

export function clampContentScale(percent: number): number {
  if (!Number.isFinite(percent)) {
    return 100;
  }
  return Math.min(CONTENT_SCALE_MAX, Math.max(CONTENT_SCALE_MIN, Math.round(percent)));
}

export function scalePercentFromBox(box: ContentBox, fitBox: ContentBox): number {
  if (fitBox.widthMm <= 0) {
    return 100;
  }
  return clampContentScale((box.widthMm / fitBox.widthMm) * 100);
}

export function scaleBoxToPercent(box: ContentBox, fitBox: ContentBox, percent: number): ContentBox {
  const scale = clampContentScale(percent) / 100;
  const widthMm = fitBox.widthMm * scale;
  const heightMm = fitBox.heightMm * scale;
  const cx = box.xMm + box.widthMm / 2;
  const cy = box.yMm + box.heightMm / 2;
  return {
    xMm: cx - widthMm / 2,
    yMm: cy - heightMm / 2,
    widthMm,
    heightMm,
  };
}

export function boxCssPercent(
  box: ContentBox,
  labelWidthMm: number,
  labelHeightMm: number,
): { left: string; top: string; width: string; height: string } {
  return {
    left: `${(box.xMm / labelWidthMm) * 100}%`,
    top: `${(box.yMm / labelHeightMm) * 100}%`,
    width: `${(box.widthMm / labelWidthMm) * 100}%`,
    height: `${(box.heightMm / labelHeightMm) * 100}%`,
  };
}

export function pointerDeltaToMm(options: {
  dxPx: number;
  dyPx: number;
  labelWidthPx: number;
  labelHeightPx: number;
  labelWidthMm: number;
  labelHeightMm: number;
}): { dxMm: number; dyMm: number } {
  if (options.labelWidthPx <= 0 || options.labelHeightPx <= 0) {
    return { dxMm: 0, dyMm: 0 };
  }
  return {
    dxMm: (options.dxPx / options.labelWidthPx) * options.labelWidthMm,
    dyMm: (options.dyPx / options.labelHeightPx) * options.labelHeightMm,
  };
}

export function contentOverflowMm(
  box: ContentBox,
  labelWidthMm: number,
  labelHeightMm: number,
): { leftMm: number; topMm: number; rightMm: number; bottomMm: number } {
  return {
    leftMm: Math.max(0, -box.xMm),
    topMm: Math.max(0, -box.yMm),
    rightMm: Math.max(0, box.xMm + box.widthMm - labelWidthMm),
    bottomMm: Math.max(0, box.yMm + box.heightMm - labelHeightMm),
  };
}

export function contentBoxToRect(box: ContentBox, dpi: number): Rect {
  return {
    x: mmToDots(box.xMm, dpi),
    y: mmToDots(box.yMm, dpi),
    width: mmToDots(box.widthMm, dpi),
    height: mmToDots(box.heightMm, dpi),
  };
}
