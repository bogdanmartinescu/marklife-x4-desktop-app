import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { barcodeDrawMetrics } from './barcode-metrics.js';
import { eanFamilyModuleCount, normalizeBarcodeValue } from './barcode-value.js';
import type { BarcodeFormat, QrEcl } from './overlay.js';

export async function renderQrCanvas(content: string, ecl: QrEcl): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  await QRCode.toCanvas(canvas, content.trim() || ' ', {
    errorCorrectionLevel: ecl,
    margin: 1,
    width: 256,
    color: { dark: '#000000', light: '#ffffff' },
  });
  return canvas;
}

export function renderBarcodeCanvas(options: {
  content: string;
  format: BarcodeFormat;
  displayValue: boolean;
  destWidth: number;
  destHeight: number;
}): HTMLCanvasElement {
  const destWidth = Math.max(8, Math.round(options.destWidth));
  const destHeight = Math.max(8, Math.round(options.destHeight));
  const value = normalizeBarcodeValue(options.format, options.content);
  try {
    const moduleCount = barcodeModuleCount(value, options.format, options.displayValue);
    const metrics = barcodeDrawMetrics(destWidth, destHeight, moduleCount, options.displayValue);
    const canvas = document.createElement('canvas');
    const jsOptions: Parameters<typeof JsBarcode>[2] = {
      format: options.format,
      displayValue: options.displayValue,
      width: metrics.moduleWidth,
      height: metrics.barHeight,
      fontSize: Math.max(1, metrics.fontSize),
      font: 'monospace',
      textMargin: metrics.textMargin,
      margin: 0,
      marginLeft: metrics.quietLeft,
      marginRight: metrics.quietRight,
      marginTop: 0,
      marginBottom: 0,
      background: '#ffffff',
      lineColor: '#000000',
      ...(options.format === 'EAN13' || options.format === 'UPC' ? { flat: false } : {}),
    };
    JsBarcode(canvas, value, jsOptions);
    return blitBarcodeToDest(canvas, destWidth, destHeight);
  } catch {
    return barcodeFallbackCanvas(destWidth, destHeight, value);
  }
}

function barcodeModuleCount(
  value: string,
  format: BarcodeFormat,
  displayValue: boolean,
): number {
  if (format === 'EAN13' || format === 'UPC') {
    return eanFamilyModuleCount(format, displayValue);
  }
  const probe = document.createElement('canvas');
  JsBarcode(probe, value, {
    format,
    width: 1,
    height: 10,
    displayValue: false,
    margin: 0,
  });
  return Math.max(1, probe.width);
}

function blitBarcodeToDest(
  source: HTMLCanvasElement,
  destWidth: number,
  destHeight: number,
): HTMLCanvasElement {
  if (source.width === destWidth && source.height === destHeight) {
    return source;
  }
  const dest = document.createElement('canvas');
  dest.width = destWidth;
  dest.height = destHeight;
  const ctx = dest.getContext('2d');
  if (!ctx) {
    return source;
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, destWidth, destHeight);
  ctx.imageSmoothingEnabled = false;
  const scale = Math.min(destWidth / Math.max(1, source.width), destHeight / Math.max(1, source.height));
  const width = source.width * scale;
  const height = source.height * scale;
  ctx.drawImage(source, (destWidth - width) / 2, (destHeight - height) / 2, width, height);
  return dest;
}

function barcodeFallbackCanvas(width: number, height: number, content: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#000000';
    ctx.font = `${Math.max(10, Math.round(height * 0.2))}px monospace`;
    ctx.textBaseline = 'middle';
    ctx.fillText(content || 'barcode', 8, height / 2, width - 16);
  }
  return canvas;
}

export function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image could not be decoded'));
    image.src = src;
  });
}
