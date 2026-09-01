import { copyToUint8Array } from '@/features/import/source-bytes.js';

export async function rgbaFromPngBytes(
  png: Uint8Array,
): Promise<{ width: number; height: number; rgba: Uint8Array }> {
  const blob = new Blob([copyToUint8Array(png).buffer], { type: 'image/png' });
  const url = URL.createObjectURL(blob);
  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, image.naturalWidth);
    canvas.height = Math.max(1, image.naturalHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context is unavailable');
    }
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return {
      width: canvas.width,
      height: canvas.height,
      rgba: new Uint8Array(data.data.buffer.slice(0)),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Print history PNG could not be decoded'));
    image.src = src;
  });
}
