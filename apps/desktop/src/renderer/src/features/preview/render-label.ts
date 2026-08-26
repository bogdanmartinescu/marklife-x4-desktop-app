import { computeFitRect, mmToDots, type FitMode, type Rotation } from '@thermalbridge/thermal-core';
import { bytesToBlob } from '../import/source-bytes.js';
import { contentBoxToRect, type ContentBox } from './content-placement.js';
import { renderPdfPage } from './pdf.js';
import { intrinsicSize } from './source-size.js';

export interface RenderedLabel {
  width: number;
  height: number;
  rgba: Uint8Array;
  previewUrl: string;
}

export async function decodeImageElement(
  bytes: Uint8Array,
  mimeType: string,
): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(bytesToBlob(bytes, mimeType));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Image could not be decoded'));
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context is unavailable');
    }
    context.drawImage(image, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function renderSourceBitmap(options: {
  bytes: Uint8Array;
  mimeType: string;
  pageNumber: number;
  dpi: number;
}): Promise<CanvasImageSource> {
  if (options.mimeType === 'application/pdf') {
    return renderPdfPage(options.bytes, options.pageNumber, options.dpi);
  }
  return decodeImageElement(options.bytes, options.mimeType);
}

export function renderLabelCanvas(options: {
  source: CanvasImageSource;
  widthMm: number;
  heightMm: number;
  dpi: number;
  fitMode: FitMode;
  rotation: Rotation;
  contentBox?: ContentBox;
}): { canvas: HTMLCanvasElement; width: number; height: number } {
  const targetW = mmToDots(options.widthMm, options.dpi);
  const targetH = mmToDots(options.heightMm, options.dpi);
  const rotated = rotateSource(options.source, options.rotation);
  const size = intrinsicSize(rotated);
  const rect =
    options.contentBox === undefined
      ? computeFitRect(size.width, size.height, targetW, targetH, options.fitMode)
      : contentBoxToRect(options.contentBox, options.dpi);
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable');
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.imageSmoothingEnabled = options.fitMode !== 'actual';
  ctx.drawImage(rotated, rect.x, rect.y, rect.width, rect.height);
  return { canvas, width: targetW, height: targetH };
}

export async function renderLabel(options: {
  bytes: Uint8Array;
  mimeType: string;
  pageNumber: number;
  widthMm: number;
  heightMm: number;
  dpi: number;
  fitMode: FitMode;
  rotation: Rotation;
  contentBox?: ContentBox;
}): Promise<RenderedLabel> {
  const source = await renderSourceBitmap({
    bytes: options.bytes,
    mimeType: options.mimeType,
    pageNumber: options.pageNumber,
    dpi: options.dpi,
  });
  const { canvas, width, height } = renderLabelCanvas({
    source,
    widthMm: options.widthMm,
    heightMm: options.heightMm,
    dpi: options.dpi,
    fitMode: options.fitMode,
    rotation: options.rotation,
    ...(options.contentBox === undefined ? {} : { contentBox: options.contentBox }),
  });
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable');
  }
  const imageData = ctx.getImageData(0, 0, width, height);
  const blob = await canvasToPngBlob(canvas);
  return {
    width,
    height,
    rgba: new Uint8Array(imageData.data),
    previewUrl: URL.createObjectURL(blob),
  };
}

export function rotateSource(source: CanvasImageSource, rotation: Rotation): HTMLCanvasElement {
  const size = intrinsicSize(source);
  const swap = rotation === 90 || rotation === 270;
  const width = swap ? size.height : size.width;
  const height = swap ? size.width : size.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable');
  }
  ctx.translate(width / 2, height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(source, -size.width / 2, -size.height / 2);
  return canvas;
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas could not be encoded as PNG'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}
