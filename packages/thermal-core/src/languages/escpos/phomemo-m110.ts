import { mmToDots } from '../../geometry/units.js';
import { DEFAULT_LABEL_TRANSFORM, type LabelTransform } from '../../jobs/types.js';
import type { MediaSettings } from '../tspl/types.js';
import { floydSteinberg } from '../../bitmap/floyd-steinberg.js';
import { rgbaToGrayscale } from '../../bitmap/grayscale.js';
import { mirrorX, mirrorY } from '../../bitmap/mirror.js';
import { negateThreshold } from '../../bitmap/negative.js';
import { packBits } from '../../bitmap/pack-bits.js';
import { rotateBy } from '../../bitmap/rotate.js';
import { applyThreshold } from '../../bitmap/threshold.js';
import { DEFAULT_BITMAP_ENCODING, type DitherMode, type RgbaImage } from '../../bitmap/types.js';

/** M110 / M120 / M220 print head width. */
export const PHOMEMO_M110_WIDTH_PX = 384;
export const PHOMEMO_M110_BYTES_PER_LINE = PHOMEMO_M110_WIDTH_PX / 8;

const CMD_SPEED = [0x1b, 0x4e, 0x0d] as const;
const CMD_DENSITY = [0x1b, 0x4e, 0x04] as const;
const CMD_MEDIA = [0x1f, 0x11] as const;
const GS_V0 = [0x1d, 0x76, 0x30, 0x00] as const;
const FOOTER = [0x1f, 0xf0, 0x05, 0x00, 0x1f, 0xf0, 0x03, 0x00] as const;

const MEDIA_BYTE: Record<MediaSettings['mode'], number> = {
  gap: 0x0a,
  continuous: 0x0b,
  'black-mark': 0x26,
};

export interface PhomemoM110CommandOptions {
  raster: Uint8Array;
  height: number;
  widthBytes?: number;
  speed?: number;
  density?: number;
  media?: MediaSettings['mode'];
}

export function encodePhomemoM110Commands(options: PhomemoM110CommandOptions): Uint8Array {
  const widthBytes = options.widthBytes ?? PHOMEMO_M110_BYTES_PER_LINE;
  const height = options.height;
  if (height <= 0 || widthBytes <= 0) {
    throw new Error(`Invalid Phomemo raster ${widthBytes}x${height}`);
  }
  if (options.raster.length !== widthBytes * height) {
    throw new Error(
      `Phomemo raster size ${options.raster.length} != ${widthBytes * height}`,
    );
  }
  const speed = clampInt(options.speed ?? 5, 1, 5);
  const density = clampInt(options.density ?? 15, 1, 15);
  const media = MEDIA_BYTE[options.media ?? 'gap'];
  const out = new Uint8Array(11 + 8 + options.raster.length + 8);
  let offset = 0;
  offset = writeBytes(out, offset, [...CMD_SPEED, speed]);
  offset = writeBytes(out, offset, [...CMD_DENSITY, density]);
  offset = writeBytes(out, offset, [...CMD_MEDIA, media]);
  offset = writeBytes(out, offset, [...GS_V0]);
  out[offset++] = widthBytes & 0xff;
  out[offset++] = (widthBytes >> 8) & 0xff;
  out[offset++] = height & 0xff;
  out[offset++] = (height >> 8) & 0xff;
  out.set(options.raster, offset);
  offset += options.raster.length;
  writeBytes(out, offset, [...FOOTER]);
  return out;
}

export interface BuildPhomemoM110JobOptions {
  image: RgbaImage;
  widthMm: number;
  heightMm: number;
  dpi: number;
  density: number;
  speed: number;
  media: MediaSettings;
  transform?: LabelTransform;
  dither?: DitherMode;
  threshold?: number;
}

export function buildPhomemoM110Job(opts: BuildPhomemoM110JobOptions): Uint8Array {
  const transform = opts.transform ?? DEFAULT_LABEL_TRANSFORM;
  const dither = opts.dither ?? 'threshold';
  const threshold = opts.threshold ?? 128;

  let gray = rgbaToGrayscale(opts.image);
  let width = opts.image.width;
  let height = opts.image.height;

  const rotated = rotateBy(gray, width, height, transform.rotation);
  gray = rotated.data;
  width = rotated.width;
  height = rotated.height;

  if (transform.mirrorX) {
    gray = mirrorX(gray, width, height);
  }
  if (transform.mirrorY) {
    gray = mirrorY(gray, width, height);
  }

  const placed = placeOnPhomemoHead({
    gray,
    width,
    height,
    offsetXpx: mmToDots(transform.offsetXmm, opts.dpi),
    offsetYpx: mmToDots(transform.offsetYmm, opts.dpi),
  });

  let pixels =
    dither === 'floyd-steinberg'
      ? floydSteinberg(placed.data, placed.width, placed.height, threshold)
      : applyThreshold(placed.data, threshold);

  if (transform.negative) {
    pixels = negateThreshold(pixels);
  }

  const bitmap = packBits(pixels, placed.width, placed.height, DEFAULT_BITMAP_ENCODING);
  return encodePhomemoM110Commands({
    raster: bitmap.data,
    height: placed.height,
    widthBytes: bitmap.bytesPerRow,
    speed: opts.speed,
    density: opts.density,
    media: opts.media.mode,
  });
}

/**
 * Map an already-composed editor bitmap onto the M110 raster.
 * GS v 0 width is the label width (the official filter does the same): a 40 mm
 * canvas stays 320 dots / 40 bytes, not padded to the 384-dot head. Firmware
 * left-aligns that raster to the loaded label, which matches the 40×30 editor.
 * Wider layouts are center-cropped to 384 dots so left/right alignment is kept.
 */
export function placeOnPhomemoHead(options: {
  gray: Uint8Array;
  width: number;
  height: number;
  offsetXpx?: number;
  offsetYpx?: number;
}): { data: Uint8Array; width: number; height: number } {
  let gray = options.gray;
  let width = Math.max(1, options.width);
  const height = Math.max(1, options.height);
  if (width > PHOMEMO_M110_WIDTH_PX) {
    const originX = Math.floor((width - PHOMEMO_M110_WIDTH_PX) / 2);
    const cropped = new Uint8Array(PHOMEMO_M110_WIDTH_PX * height).fill(255);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < PHOMEMO_M110_WIDTH_PX; x += 1) {
        cropped[y * PHOMEMO_M110_WIDTH_PX + x] = gray[y * width + originX + x] ?? 255;
      }
    }
    gray = cropped;
    width = PHOMEMO_M110_WIDTH_PX;
  }
  const originX = options.offsetXpx ?? 0;
  const offsetY = options.offsetYpx ?? 0;
  const contentRight = width + originX;
  const outW = Math.min(
    PHOMEMO_M110_WIDTH_PX,
    Math.max(8, Math.ceil(Math.max(width, contentRight, 1) / 8) * 8),
  );
  const outH = Math.max(1, height + Math.max(0, offsetY));
  const canvas = new Uint8Array(outW * outH).fill(255);
  for (let y = 0; y < height; y++) {
    const destY = y + offsetY;
    if (destY < 0 || destY >= outH) {
      continue;
    }
    for (let x = 0; x < width; x++) {
      const destX = x + originX;
      if (destX < 0 || destX >= outW) {
        continue;
      }
      canvas[destY * outW + destX] = gray[y * width + x] ?? 255;
    }
  }
  return { data: canvas, width: outW, height: outH };
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

function writeBytes(target: Uint8Array, offset: number, values: number[]): number {
  target.set(values, offset);
  return offset + values.length;
}
