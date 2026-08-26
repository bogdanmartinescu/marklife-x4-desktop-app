import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
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
  height: number;
}): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, options.content.trim() || '0', {
      format: options.format,
      displayValue: options.displayValue,
      margin: 4,
      width: 2,
      height: Math.max(20, options.height),
      background: '#ffffff',
      lineColor: '#000000',
    });
  } catch {
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = Math.max(40, options.height);
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000000';
      ctx.font = '12px sans-serif';
      ctx.fillText(options.content || 'barcode', 8, canvas.height / 2);
    }
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
