import { rgbaToGrayscale } from './grayscale.js';

const STRETCH_MIN_RANGE = 8;
const STRETCH_MAX_RANGE = 200;
const UNSHARP_AMOUNT = 0.25;

export function contrastStretch(gray: Uint8Array): Uint8Array {
  let min = 255;
  let max = 0;
  for (let i = 0; i < gray.length; i++) {
    const value = gray[i] ?? 0;
    if (value < min) {
      min = value;
    }
    if (value > max) {
      max = value;
    }
  }
  const range = max - min;
  if (range < STRETCH_MIN_RANGE || range > STRETCH_MAX_RANGE) {
    return new Uint8Array(gray);
  }
  const out = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) {
    const value = gray[i] ?? 0;
    out[i] = Math.round(((value - min) * 255) / range);
  }
  return out;
}

export function unsharpMask(gray: Uint8Array, width: number, height: number, amount: number): Uint8Array {
  const blur = boxBlur3(gray, width, height);
  const out = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) {
    const value = gray[i] ?? 0;
    const sharpened = value + amount * (value - (blur[i] ?? value));
    out[i] = clampByte(sharpened);
  }
  return out;
}

export function enhanceDocumentRgba(rgba: Uint8Array, width: number, height: number): Uint8Array {
  const gray = rgbaToGrayscale({ width, height, data: new Uint8ClampedArray(rgba) });
  const stretched = contrastStretch(gray);
  const sharpened = unsharpMask(stretched, width, height, UNSHARP_AMOUNT);
  return grayToOpaqueRgba(sharpened);
}

function boxBlur3(gray: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(gray.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            continue;
          }
          sum += gray[ny * width + nx] ?? 0;
          count += 1;
        }
      }
      out[y * width + x] = Math.round(sum / Math.max(1, count));
    }
  }
  return out;
}

function grayToOpaqueRgba(gray: Uint8Array): Uint8Array {
  const out = new Uint8Array(gray.length * 4);
  for (let i = 0; i < gray.length; i++) {
    const value = gray[i] ?? 0;
    const offset = i * 4;
    out[offset] = value;
    out[offset + 1] = value;
    out[offset + 2] = value;
    out[offset + 3] = 255;
  }
  return out;
}

function clampByte(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 255) {
    return 255;
  }
  return Math.round(value);
}
