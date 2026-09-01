import { mmToDots, type Rect } from '@thermalbridge/thermal-core';
import { loadHtmlImage, renderBarcodeCanvas, renderQrCanvas } from './codes.js';
import { resolveFieldText } from './field-value.js';
import { drawPrintIcon, getPrintIcon } from './icon-catalog.js';
import { fitImageInRect, mmRectToDots } from './image-fit.js';
import type { OverlayElement } from './overlay.js';
import { parseTableCells, tableCellBounds } from './table-cells.js';
import type { ContentBox } from '../preview/content-placement.js';

export function overlayDestRect(
  overlay: OverlayElement,
  dpi: number,
  label: { widthMm: number; heightMm: number },
): Rect {
  return mmRectToDots(
    overlay,
    label.widthMm,
    label.heightMm,
    mmToDots(label.widthMm, dpi),
    mmToDots(label.heightMm, dpi),
  );
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

function fillColor(overlay: OverlayElement): string {
  return overlay.fill === 'white' ? '#ffffff' : '#000000';
}

function drawTextBox(
  ctx: CanvasRenderingContext2D,
  overlay: OverlayElement,
  dpi: number,
  width: number,
  text: string,
): void {
  ctx.fillStyle = fillColor(overlay);
  ctx.font = fontCss(overlay, dpi);
  ctx.textBaseline = 'top';
  ctx.textAlign = overlay.align;
  const x = overlay.align === 'center' ? width / 2 : overlay.align === 'right' ? width : 0;
  ctx.fillText(text, x, 0, width);
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strokePx: number,
): void {
  const y = height / 2;
  const head = Math.min(width * 0.28, height * 0.9, 24);
  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#000000';
  ctx.lineWidth = strokePx;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(Math.max(0, width - head), y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width, y);
  ctx.lineTo(width - head, y - head * 0.55);
  ctx.lineTo(width - head, y + head * 0.55);
  ctx.closePath();
  ctx.fill();
}

export async function drawOverlays(
  ctx: CanvasRenderingContext2D,
  overlays: OverlayElement[],
  dpi: number,
  options: { copyIndex?: number; now?: Date; widthMm: number; heightMm: number },
): Promise<void> {
  const copyIndex = options.copyIndex ?? 0;
  const now = options.now ?? new Date();
  for (const overlay of overlays) {
    const rect = overlayDestRect(overlay, dpi, { widthMm: options.widthMm, heightMm: options.heightMm });
    ctx.save();
    ctx.translate(rect.x, rect.y);
    ctx.rotate((overlay.rotation * Math.PI) / 180);
    switch (overlay.kind) {
      case 'rect': {
        ctx.fillStyle = fillColor(overlay);
        ctx.fillRect(0, 0, rect.width, rect.height);
        if (overlay.strokeMm > 0) {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = Math.max(1, mmToDots(overlay.strokeMm, dpi));
          ctx.strokeRect(0, 0, rect.width, rect.height);
        }
        break;
      }
      case 'circle': {
        ctx.beginPath();
        ctx.ellipse(rect.width / 2, rect.height / 2, rect.width / 2, rect.height / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = fillColor(overlay);
        ctx.fill();
        if (overlay.strokeMm > 0) {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = Math.max(1, mmToDots(overlay.strokeMm, dpi));
          ctx.stroke();
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
      case 'arrow': {
        drawArrow(ctx, rect.width, rect.height, Math.max(1, mmToDots(overlay.strokeMm, dpi)));
        break;
      }
      case 'text': {
        drawTextBox(ctx, overlay, dpi, rect.width, overlay.text);
        break;
      }
      case 'field': {
        drawTextBox(ctx, overlay, dpi, rect.width, resolveFieldText(overlay, { now, copyIndex }));
        break;
      }
      case 'table': {
        const cells = parseTableCells(overlay.text, overlay.tableRows, overlay.tableCols);
        const bounds = tableCellBounds(rect.width, rect.height, overlay.tableRows, overlay.tableCols);
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = '#000000';
        ctx.lineWidth = Math.max(1, mmToDots(overlay.strokeMm, dpi));
        ctx.strokeRect(0, 0, rect.width, rect.height);
        ctx.font = fontCss(overlay, dpi);
        ctx.textBaseline = 'middle';
        ctx.textAlign = overlay.align;
        for (const cell of bounds) {
          ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
          const value = cells[cell.row]?.[cell.col] ?? '';
          const textX =
            overlay.align === 'center'
              ? cell.x + cell.width / 2
              : overlay.align === 'right'
                ? cell.x + cell.width - 2
                : cell.x + 2;
          ctx.fillText(value, textX, cell.y + cell.height / 2, Math.max(1, cell.width - 4));
        }
        break;
      }
      case 'icon': {
        const icon = getPrintIcon(overlay.iconId);
        if (icon) {
          drawPrintIcon(ctx, icon, rect.width, rect.height);
        }
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
          destWidth: rect.width,
          destHeight: rect.height,
        });
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(barcode, 0, 0, rect.width, rect.height);
        ctx.imageSmoothingEnabled = true;
        break;
      }
      case 'image': {
        if (overlay.src) {
          const image = await loadHtmlImage(overlay.src);
          const fit = fitImageInRect(image.naturalWidth, image.naturalHeight, rect.width, rect.height);
          ctx.drawImage(image, fit.x, fit.y, fit.width, fit.height);
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
