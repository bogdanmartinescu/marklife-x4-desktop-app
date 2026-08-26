import { computeFitRect } from '../geometry/fit.js';
import { mmToDots } from '../geometry/units.js';
import { DEFAULT_LABEL_TRANSFORM, type LabelTransform } from '../jobs/types.js';
import { TsplJobBuilder } from '../languages/tspl/job-builder.js';
import type { MediaSettings } from '../languages/tspl/types.js';
import { floydSteinberg } from './floyd-steinberg.js';
import { rgbaToGrayscale } from './grayscale.js';
import { mirrorX, mirrorY } from './mirror.js';
import { negateThreshold } from './negative.js';
import { packBits } from './pack-bits.js';
import { resizeNearest } from './resize.js';
import { rotateBy } from './rotate.js';
import { applyThreshold } from './threshold.js';
import {
  DEFAULT_BITMAP_ENCODING,
  type BitmapEncoding,
  type DitherMode,
  type RgbaImage,
} from './types.js';

export interface BuildPrintJobOptions {
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
  copies?: number;
  reference?: { x: number; y: number };
  offsetMm?: number;
  direction?: { feed: 0 | 1; mirror: 0 | 1 };
  encoding?: BitmapEncoding;
}

export function buildPrintJob(opts: BuildPrintJobOptions): Uint8Array {
  const transform = opts.transform ?? DEFAULT_LABEL_TRANSFORM;
  const dither = opts.dither ?? 'threshold';
  const threshold = opts.threshold ?? 128;
  const copies = opts.copies ?? 1;
  const encoding = opts.encoding ?? DEFAULT_BITMAP_ENCODING;

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

  const targetW = mmToDots(opts.widthMm, opts.dpi);
  const targetH = mmToDots(opts.heightMm, opts.dpi);
  const placed = placeOnCanvas(gray, width, height, targetW, targetH, transform.fitMode);

  let pixels =
    dither === 'floyd-steinberg'
      ? floydSteinberg(placed, targetW, targetH, threshold)
      : applyThreshold(placed, threshold);

  if (transform.negative) {
    pixels = negateThreshold(pixels);
  }

  const bitmap = packBits(pixels, targetW, targetH, encoding);
  const bitmapX = mmToDots(transform.offsetXmm, opts.dpi);
  const bitmapY = mmToDots(transform.offsetYmm, opts.dpi);

  const job = new TsplJobBuilder({ encoding })
    .sizeMm(opts.widthMm, opts.heightMm)
    .media(opts.media)
    .reference(opts.reference?.x ?? 0, opts.reference?.y ?? 0)
    .offsetMm(opts.offsetMm ?? 0)
    .density(opts.density)
    .speed(opts.speed)
    .direction(opts.direction?.feed ?? 0, opts.direction?.mirror ?? 0)
    .clear()
    .bitmap({ x: bitmapX, y: bitmapY, bitmap, encoding })
    .print(1, copies);

  return job.encode();
}

function placeOnCanvas(
  gray: Uint8Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  mode: LabelTransform['fitMode'],
): Uint8Array {
  const rect = computeFitRect(srcW, srcH, dstW, dstH, mode);
  const resized = resizeNearest(
    gray,
    srcW,
    srcH,
    Math.max(1, rect.width),
    Math.max(1, rect.height),
  );
  const canvas = new Uint8Array(dstW * dstH).fill(255);

  for (let y = 0; y < rect.height; y++) {
    const destY = rect.y + y;
    if (destY < 0 || destY >= dstH) {
      continue;
    }
    for (let x = 0; x < rect.width; x++) {
      const destX = rect.x + x;
      if (destX < 0 || destX >= dstW) {
        continue;
      }
      canvas[destY * dstW + destX] = resized[y * rect.width + x] ?? 255;
    }
  }

  return canvas;
}
