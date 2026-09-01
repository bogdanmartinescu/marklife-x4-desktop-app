export function isSvgDataUrl(src: string): boolean {
  return src.startsWith('data:image/svg+xml');
}

export function normalizeImportedImage(
  src: string,
  image: HTMLImageElement,
): { src: string; width: number; height: number } {
  const width = Math.max(1, image.naturalWidth);
  const height = Math.max(1, image.naturalHeight);
  if (!isSvgDataUrl(src)) {
    return { src, width, height };
  }
  const maxEdge = 1024;
  const scale = Math.min(maxEdge / width, maxEdge / height, 8);
  const outWidth = Math.max(1, Math.round(width * scale));
  const outHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { src, width, height };
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outWidth, outHeight);
  ctx.drawImage(image, 0, 0, outWidth, outHeight);
  return { src: canvas.toDataURL('image/png'), width: outWidth, height: outHeight };
}
