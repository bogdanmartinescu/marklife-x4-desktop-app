export interface FittedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function fitImageInRect(
  srcWidth: number,
  srcHeight: number,
  destWidth: number,
  destHeight: number,
): FittedRect {
  if (srcWidth <= 0 || srcHeight <= 0 || destWidth <= 0 || destHeight <= 0) {
    return { x: 0, y: 0, width: Math.max(0, destWidth), height: Math.max(0, destHeight) };
  }
  const scale = Math.min(destWidth / srcWidth, destHeight / srcHeight);
  const width = srcWidth * scale;
  const height = srcHeight * scale;
  return {
    x: (destWidth - width) / 2,
    y: (destHeight - height) / 2,
    width,
    height,
  };
}

export function mmRectToDots(
  box: { xMm: number; yMm: number; widthMm: number; heightMm: number },
  labelWidthMm: number,
  labelHeightMm: number,
  canvasWidth: number,
  canvasHeight: number,
): FittedRect {
  if (labelWidthMm <= 0 || labelHeightMm <= 0) {
    return { x: 0, y: 0, width: canvasWidth, height: canvasHeight };
  }
  const x0 = Math.round((box.xMm / labelWidthMm) * canvasWidth);
  const y0 = Math.round((box.yMm / labelHeightMm) * canvasHeight);
  const x1 = Math.round(((box.xMm + box.widthMm) / labelWidthMm) * canvasWidth);
  const y1 = Math.round(((box.yMm + box.heightMm) / labelHeightMm) * canvasHeight);
  return {
    x: x0,
    y: y0,
    width: Math.max(1, x1 - x0),
    height: Math.max(1, y1 - y0),
  };
}
