export interface SizedSource {
  width?: number;
  height?: number;
  naturalWidth?: number;
  naturalHeight?: number;
}

function numericSize(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function intrinsicSize(source: SizedSource | CanvasImageSource): { width: number; height: number } {
  const record = source as SizedSource;
  const naturalWidth = numericSize(record.naturalWidth);
  const naturalHeight = numericSize(record.naturalHeight);
  if (naturalWidth !== undefined && naturalWidth > 0 && naturalHeight !== undefined) {
    return { width: naturalWidth, height: naturalHeight };
  }
  const width = numericSize(record.width);
  const height = numericSize(record.height);
  if (width !== undefined && height !== undefined) {
    return { width, height };
  }
  throw new Error('Unsupported image source');
}
