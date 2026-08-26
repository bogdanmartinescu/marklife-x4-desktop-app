export type OverlayKind = 'text' | 'rect' | 'line' | 'qr' | 'barcode' | 'image';
export type TextAlign = 'left' | 'center' | 'right';
export type QrEcl = 'L' | 'M' | 'Q' | 'H';
export type BarcodeFormat = 'CODE128' | 'CODE39' | 'EAN13' | 'UPC';
export type FontStyle = '' | 'bold' | 'italic' | 'bold italic';

export interface OverlayElement {
  id: string;
  kind: OverlayKind;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  rotation: number;
  text: string;
  fontSizeMm: number;
  fontFamily: string;
  fontStyle: FontStyle;
  align: TextAlign;
  fill: 'black' | 'white';
  strokeMm: number;
  content: string;
  qrEcl: QrEcl;
  barcodeFormat: BarcodeFormat;
  barcodeDisplayValue: boolean;
  src: string;
}

const DEFAULTS: Omit<OverlayElement, 'id' | 'kind' | 'xMm' | 'yMm' | 'widthMm' | 'heightMm'> = {
  rotation: 0,
  text: '',
  fontSizeMm: 8,
  fontFamily: 'sans-serif',
  fontStyle: '',
  align: 'left',
  fill: 'black',
  strokeMm: 0.4,
  content: '',
  qrEcl: 'M',
  barcodeFormat: 'CODE128',
  barcodeDisplayValue: true,
  src: '',
};

export function createOverlayId(): string {
  return `el-${crypto.randomUUID()}`;
}

function clampPlacement(
  xMm: number,
  yMm: number,
  widthMm: number,
  heightMm: number,
  labelWidthMm: number,
  labelHeightMm: number,
): { xMm: number; yMm: number; widthMm: number; heightMm: number } {
  const width = Math.min(widthMm, labelWidthMm);
  const height = Math.min(heightMm, labelHeightMm);
  return {
    xMm: Math.max(0, Math.min(xMm, labelWidthMm - width)),
    yMm: Math.max(0, Math.min(yMm, labelHeightMm - height)),
    widthMm: width,
    heightMm: height,
  };
}

export function createTextOverlay(labelWidthMm: number, labelHeightMm: number): OverlayElement {
  return {
    ...DEFAULTS,
    id: createOverlayId(),
    kind: 'text',
    ...clampPlacement(labelWidthMm * 0.1, labelHeightMm * 0.1, labelWidthMm * 0.8, 12, labelWidthMm, labelHeightMm),
    text: 'Text',
    fontSizeMm: 8,
    fontStyle: 'bold',
    align: 'left',
  };
}

export function createRectOverlay(labelWidthMm: number, labelHeightMm: number): OverlayElement {
  return {
    ...DEFAULTS,
    id: createOverlayId(),
    kind: 'rect',
    ...clampPlacement(labelWidthMm * 0.2, labelHeightMm * 0.2, 30, 12, labelWidthMm, labelHeightMm),
    fill: 'black',
    strokeMm: 0.4,
  };
}

export function createLineOverlay(labelWidthMm: number, labelHeightMm: number): OverlayElement {
  return {
    ...DEFAULTS,
    id: createOverlayId(),
    kind: 'line',
    ...clampPlacement(labelWidthMm * 0.1, labelHeightMm * 0.25, 60, 4, labelWidthMm, labelHeightMm),
    strokeMm: 0.5,
  };
}

export function createQrOverlay(labelWidthMm: number, labelHeightMm: number): OverlayElement {
  return {
    ...DEFAULTS,
    id: createOverlayId(),
    kind: 'qr',
    ...clampPlacement(labelWidthMm * 0.1, labelHeightMm * 0.1, 25, 25, labelWidthMm, labelHeightMm),
    content: 'https://',
    qrEcl: 'M',
  };
}

export function createBarcodeOverlay(labelWidthMm: number, labelHeightMm: number): OverlayElement {
  return {
    ...DEFAULTS,
    id: createOverlayId(),
    kind: 'barcode',
    ...clampPlacement(labelWidthMm * 0.1, labelHeightMm * 0.2, 50, 16, labelWidthMm, labelHeightMm),
    content: '1234567890',
    barcodeFormat: 'CODE128',
    barcodeDisplayValue: true,
  };
}

export function createImageOverlay(
  labelWidthMm: number,
  labelHeightMm: number,
  src: string,
  naturalWidth: number,
  naturalHeight: number,
): OverlayElement {
  const ratio = naturalWidth > 0 ? naturalHeight / naturalWidth : 1;
  const widthMm = Math.min(40, labelWidthMm * 0.5);
  const heightMm = widthMm * ratio;
  return {
    ...DEFAULTS,
    id: createOverlayId(),
    kind: 'image',
    ...clampPlacement(
      (labelWidthMm - widthMm) / 2,
      (labelHeightMm - heightMm) / 2,
      widthMm,
      heightMm,
      labelWidthMm,
      labelHeightMm,
    ),
    src,
  };
}

export function duplicateOverlay(overlay: OverlayElement): OverlayElement {
  return {
    ...overlay,
    id: createOverlayId(),
    xMm: overlay.xMm + 4,
    yMm: overlay.yMm + 4,
  };
}

export function centerOverlay(
  overlay: OverlayElement,
  labelWidthMm: number,
  labelHeightMm: number,
): Pick<OverlayElement, 'xMm' | 'yMm'> {
  return {
    xMm: (labelWidthMm - overlay.widthMm) / 2,
    yMm: (labelHeightMm - overlay.heightMm) / 2,
  };
}

export function centerOverlayH(
  overlay: OverlayElement,
  labelWidthMm: number,
): Pick<OverlayElement, 'xMm'> {
  return { xMm: (labelWidthMm - overlay.widthMm) / 2 };
}

export function centerOverlayV(
  overlay: OverlayElement,
  labelHeightMm: number,
): Pick<OverlayElement, 'yMm'> {
  return { yMm: (labelHeightMm - overlay.heightMm) / 2 };
}

export function moveOverlayZ(
  overlays: OverlayElement[],
  id: string,
  direction: 'up' | 'down',
): OverlayElement[] {
  const index = overlays.findIndex((item) => item.id === id);
  if (index < 0) {
    return overlays;
  }
  const target = direction === 'up' ? index + 1 : index - 1;
  if (target < 0 || target >= overlays.length) {
    return overlays;
  }
  const next = [...overlays];
  const current = next[index];
  const swap = next[target];
  if (current === undefined || swap === undefined) {
    return overlays;
  }
  next[index] = swap;
  next[target] = current;
  return next;
}
