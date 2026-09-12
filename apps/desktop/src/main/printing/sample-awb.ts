import { MARKLIFE_X4 } from '@thermalbridge/printer-profiles';
import { invertRgba, mmToDots, type RgbaImage } from '@thermalbridge/thermal-core';

/** 5×7 caps used for the built-in test AWB. Each row is a 5-bit mask, MSB = left. */
const FONT: Readonly<Record<string, readonly number[]>> = {
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '-': [0, 0, 0, 0b11111, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0, 0b01100],
  '/': [0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0, 0],
  ':': [0, 0b01100, 0, 0, 0b01100, 0, 0],
  '0': [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  '1': [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  '2': [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111],
  '3': [0b01110, 0b10001, 0b00001, 0b00110, 0b00001, 0b10001, 0b01110],
  '4': [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  '5': [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  '6': [0b01110, 0b10000, 0b11110, 0b10001, 0b10001, 0b10001, 0b01110],
  '7': [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  '8': [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  '9': [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001, 0b01110],
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
};

export function buildSampleAwb(widthMm: number, heightMm: number, dpi: number): RgbaImage {
  const width = mmToDots(widthMm, dpi);
  const height = mmToDots(heightMm, dpi);
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  const scale = Math.max(1, Math.min(3, Math.floor(Math.min(width, height) / 220)));
  const margin = Math.max(4, Math.round(Math.min(width, height) * 0.03));
  const ink = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }
    const offset = (y * width + x) * 4;
    data[offset] = 0;
    data[offset + 1] = 0;
    data[offset + 2] = 0;
    data[offset + 3] = 255;
  };

  rect(ink, margin, margin, width - margin - 1, height - margin - 1);
  const headerBottom = margin + 10 * scale + 8;
  hline(ink, margin, headerBottom, width - margin - 1);
  text(ink, 'THERMALBRIDGE TEST AWB', margin + 6, margin + 4, scale);
  text(ink, 'CARGUS SAMPLE  1/1 COLET', margin + 6, margin + 4 + 8 * scale, scale);

  const trackTop = headerBottom + 8;
  text(ink, 'AWB TB-TEST-0001', margin + 6, trackTop, scale);
  const barTop = trackTop + 9 * scale;
  const barHeight = Math.max(24, Math.round(height * 0.08));
  barcode(ink, 'TBTEST0001', margin + 8, barTop, width - margin * 2 - 16, barHeight);

  const mid = margin + Math.round((height - margin * 2) * 0.42);
  hline(ink, margin, mid, width - margin - 1);
  const col = Math.floor(width / 2);
  vline(ink, col, mid, height - margin - 1);
  text(ink, 'EXPEDITOR', margin + 6, mid + 6, scale);
  text(ink, 'DAVERA SRL', margin + 6, mid + 6 + 9 * scale, scale);
  text(ink, 'STR. SECIU 1', margin + 6, mid + 6 + 18 * scale, scale);
  text(ink, 'BUCURESTI', margin + 6, mid + 6 + 27 * scale, scale);
  text(ink, 'DESTINATAR', col + 6, mid + 6, scale);
  text(ink, 'MLB DIGITAL SRL', col + 6, mid + 6 + 9 * scale, scale);
  text(ink, 'ALEEA LOUTRU 2', col + 6, mid + 6 + 18 * scale, scale);
  text(ink, 'BUCURESTI', col + 6, mid + 6 + 27 * scale, scale);

  const footer = height - margin - 12 * scale;
  hline(ink, margin, footer, width - margin - 1);
  text(ink, `${Math.round(widthMm)}X${Math.round(heightMm)} MM  203 DPI`, margin + 6, footer + 4, scale);

  return { width, height, data };
}

/** Same polarity as live prints: X4 firmware inverts, so the job RGBA is inverted here. */
export function prepareTestPageImage(
  profileId: string,
  widthMm: number,
  heightMm: number,
  dpi: number,
): RgbaImage {
  const image = buildSampleAwb(widthMm, heightMm, dpi);
  if (profileId !== MARKLIFE_X4.id) {
    return image;
  }
  return {
    width: image.width,
    height: image.height,
    data: new Uint8ClampedArray(invertRgba(new Uint8Array(image.data))),
  };
}

function rect(
  ink: (x: number, y: number) => void,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  hline(ink, x0, y0, x1);
  hline(ink, x0, y1, x1);
  vline(ink, x0, y0, y1);
  vline(ink, x1, y0, y1);
}

function hline(ink: (x: number, y: number) => void, x0: number, y: number, x1: number): void {
  const start = Math.min(x0, x1);
  const end = Math.max(x0, x1);
  for (let x = start; x <= end; x++) {
    ink(x, y);
  }
}

function vline(ink: (x: number, y: number) => void, x: number, y0: number, y1: number): void {
  const start = Math.min(y0, y1);
  const end = Math.max(y0, y1);
  for (let y = start; y <= end; y++) {
    ink(x, y);
  }
}

function text(
  ink: (x: number, y: number) => void,
  value: string,
  x: number,
  y: number,
  scale: number,
): void {
  let cursor = x;
  for (const raw of value) {
    const glyph = FONT[raw] ?? FONT[raw.toUpperCase()] ?? FONT[' '];
    if (glyph === undefined) {
      cursor += 6 * scale;
      continue;
    }
    for (let row = 0; row < glyph.length; row++) {
      const bits = glyph[row] ?? 0;
      for (let col = 0; col < 5; col++) {
        if ((bits & (1 << (4 - col))) === 0) {
          continue;
        }
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            ink(cursor + col * scale + dx, y + row * scale + dy);
          }
        }
      }
    }
    cursor += 6 * scale;
  }
}

function barcode(
  ink: (x: number, y: number) => void,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const modules: number[] = [1, 1, 1, 1];
  for (const char of value) {
    const code = char.charCodeAt(0);
    modules.push(2, 1, (code & 1) === 0 ? 3 : 1, 1, (code & 2) === 0 ? 1 : 2, 1);
  }
  modules.push(1, 1, 1, 1);
  const total = modules.reduce((sum, module) => sum + module, 0);
  const unit = Math.max(1, Math.floor(width / total));
  let cursor = x;
  let black = true;
  for (const module of modules) {
    const span = module * unit;
    if (black) {
      for (let py = 0; py < height; py++) {
        for (let px = 0; px < span; px++) {
          ink(cursor + px, y + py);
        }
      }
    }
    cursor += span;
    black = !black;
  }
}
