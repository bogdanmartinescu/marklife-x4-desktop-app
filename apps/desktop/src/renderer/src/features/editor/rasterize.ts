import { mmToDots, type Rect } from '@thermalbridge/thermal-core';
import { loadHtmlImage, renderBarcodeCanvas, renderQrCanvas } from './codes.js';
import type { OverlayElement } from './overlay.js';
import type { ContentBox } from '../preview/content-placement.js';

export function overlayDestRect(overlay: OverlayElement, dpi: number): Rect {
  return {
    x: mmToDots(overlay.xMm, dpi),
    y: mmToDots(overlay.yMm, dpi),
    width: mmToDots(overlay.widthMm, dpi),
    height: mmToDots(overlay.heightMm, dpi),
  };
}

export function createBlankLabelCanvas(
  widthMm: number,
  heightMm: number,
  dpi: number,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const width = mmToDots(widthMm, dpi);
  const height = mmToDots(heightMm, dpi);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable');
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  return { canvas, width, height };
}

function fontCss(overlay: OverlayElement, dpi: number): string {
  const size = Math.max(8, mmToDots(overlay.fontSizeMm, dpi));
  const italic = overlay.fontStyle.includes('italic') ? 'italic' : 'normal';
  const weight = overlay.fontStyle.includes('bold') ? '700' : '400';
  return `${italic} ${weight} ${size}px ${overlay.fontFamily}`;
}

export async function drawOverlays(
  ctx: CanvasRenderingContext2D,
  overlays: OverlayElement[],
  dpi: number,
): Promise<void> {
  for (const overlay of overlays) {
    const rect = overlayDestRect(overlay, dpi);
    ctx.save();
    ctx.translate(rect.x + rect.width / 2, rect.y + rect.height / 2);
    ctx.rotate((overlay.rotation * Math.PI) / 180);
    ctx.translate(-rect.width / 2, -rect.height / 2);
    switch (overlay.kind) {
      case 'rect': {
        ctx.fillStyle = overlay.fill === 'white' ? '#ffffff' : '#000000';
        ctx.fillRect(0, 0, rect.width, rect.height);
        if (overlay.strokeMm > 0) {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = Math.max(1, mmToDots(overlay.strokeMm, dpi));
          ctx.strokeRect(0, 0, rect.width, rect.height);
        }
        break;
      }
      case 'line': {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(1, mmToDots(overlay.strokeMm, dpi));
        ctx.beginPath();
        ctx.moveTo(0, rect.height / 2);
        ctx.lineTo(rect.width, rect.height / 2);
        ctx.stroke();
        break;
      }
      case 'text': {
        ctx.fillStyle = overlay.fill === 'white' ? '#ffffff' : '#000000';
        ctx.font = fontCss(overlay, dpi);
        ctx.textBaseline = 'top';
        ctx.textAlign = overlay.align;
        const x =
          overlay.align === 'center' ? rect.width / 2 : overlay.align === 'right' ? rect.width : 0;
        ctx.fillText(overlay.text, x, 0, rect.width);
        break;
      }
      case 'qr': {
        const qr = await renderQrCanvas(overlay.content, overlay.qrEcl);
        ctx.drawImage(qr, 0, 0, rect.width, rect.height);
        break;
      }
      case 'barcode': {
        const barcode = renderBarcodeCanvas({
          content: overlay.content,
          format: overlay.barcodeFormat,
          displayValue: overlay.barcodeDisplayValue,
          height: rect.height,
        });
        ctx.drawImage(barcode, 0, 0, rect.width, rect.height);
        break;
      }
      case 'image': {
        if (overlay.src) {
          const image = await loadHtmlImage(overlay.src);
          ctx.drawImage(image, 0, 0, rect.width, rect.height);
        }
        break;
      }
    }
    ctx.restore();
  }
}

export function contentBoxCss(
  box: ContentBox,
  widthMm: number,
  heightMm: number,
): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  return {
    left: box.xMm / widthMm,
    top: box.yMm / heightMm,
    width: box.widthMm / widthMm,
    height: box.heightMm / heightMm,
  };
}
