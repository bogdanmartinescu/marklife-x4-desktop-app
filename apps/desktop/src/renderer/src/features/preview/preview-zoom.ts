export const PREVIEW_ZOOM_MIN = 0;
export const PREVIEW_ZOOM_MAX = 200;
export const PREVIEW_ZOOM_DEFAULT = 100;

export function clampPreviewZoom(value: number): number {
  if (!Number.isFinite(value)) {
    return PREVIEW_ZOOM_DEFAULT;
  }
  return Math.min(PREVIEW_ZOOM_MAX, Math.max(PREVIEW_ZOOM_MIN, Math.round(value)));
}

export function previewLabelSize(options: {
  wellWidth: number;
  wellHeight: number;
  widthMm: number;
  heightMm: number;
  zoomPercent: number;
}): { width: number; height: number } {
  const { wellWidth, wellHeight, widthMm, heightMm } = options;
  if (wellWidth <= 0 || wellHeight <= 0 || widthMm <= 0 || heightMm <= 0) {
    return { width: 0, height: 0 };
  }
  const labelAspect = widthMm / heightMm;
  const wellAspect = wellWidth / wellHeight;
  const fit =
    labelAspect > wellAspect
      ? { width: wellWidth, height: wellWidth / labelAspect }
      : { width: wellHeight * labelAspect, height: wellHeight };
  const scale = clampPreviewZoom(options.zoomPercent) / 100;
  return {
    width: fit.width * scale,
    height: fit.height * scale,
  };
}

export function nextWellSize(
  current: { width: number; height: number },
  width: number,
  height: number,
): { width: number; height: number } {
  const next = { width: Math.round(width), height: Math.round(height) };
  if (current.width === next.width && current.height === next.height) {
    return current;
  }
  return next;
}

export function previewStageSize(options: {
  wellWidth: number;
  wellHeight: number;
  labelWidth: number;
  labelHeight: number;
  padding: number;
}): { width: number; height: number } {
  return {
    width: Math.max(options.wellWidth, Math.ceil(options.labelWidth + options.padding)),
    height: Math.max(options.wellHeight, Math.ceil(options.labelHeight + options.padding)),
  };
}

export function previewDocumentSize(options: {
  wellWidth: number;
  wellHeight: number;
  pageWidth: number;
  pageHeight: number;
  pageCount: number;
  gutter: number;
  padding: number;
  footer: number;
}): { width: number; height: number } {
  const count = Math.max(1, options.pageCount);
  const stackHeight =
    options.padding * 2 +
    count * options.pageHeight +
    (count - 1) * options.gutter +
    options.footer;
  return {
    width: Math.max(options.wellWidth, Math.ceil(options.pageWidth + options.padding)),
    height: Math.max(options.wellHeight, Math.ceil(stackHeight)),
  };
}
