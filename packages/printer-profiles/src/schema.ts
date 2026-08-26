import { z } from 'zod';

export const PrinterProfileSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  language: z.enum(['tspl', 'esc-pos', 'unknown']),
  status: z.enum(['available', 'planned']),
  dpi: z.number().positive(),
  density: z.object({
    min: z.number().int(),
    max: z.number().int(),
    default: z.number().int(),
    vendorDefault: z.number().int().optional(),
    presets: z.object({
      light: z.number().int(),
      normal: z.number().int(),
      dark: z.number().int(),
    }),
  }),
  speed: z.object({
    values: z.array(z.number().positive()),
    default: z.number().positive(),
  }),
  mediaModes: z.array(z.enum(['continuous', 'gap', 'black-mark'])).min(1),
  transforms: z.object({
    rotation: z.boolean(),
    mirror: z.boolean(),
    negative: z.boolean(),
  }),
  offsets: z.object({
    minXmm: z.number(),
    maxXmm: z.number(),
    minYmm: z.number(),
    maxYmm: z.number(),
  }),
});

export type PrinterProfile = z.infer<typeof PrinterProfileSchema>;

export const DEFAULT_LABEL_SIZES = [
  { widthMm: 40, heightMm: 12, displayName: '40 × 12 mm' },
  { widthMm: 40, heightMm: 30, displayName: '40 × 30 mm' },
  { widthMm: 50, heightMm: 30, displayName: '50 × 30 mm' },
  { widthMm: 50, heightMm: 50, displayName: '50 × 50 mm' },
  { widthMm: 70, heightMm: 40, displayName: '70 × 40 mm' },
  { widthMm: 100, heightMm: 100, displayName: '100 × 100 mm' },
  { widthMm: 100, heightMm: 150, displayName: 'AWB 100 × 150 mm' },
  { widthMm: 101.6, heightMm: 152.4, displayName: '4 × 6 in' },
  { widthMm: 100, heightMm: 200, displayName: '100 × 200 mm' },
  { widthMm: 100, heightMm: 250, displayName: '100 × 250 mm' },
  { widthMm: 105, heightMm: 148, displayName: 'A6 105 × 148 mm' },
  { widthMm: 148, heightMm: 210, displayName: 'A5 148 × 210 mm' },
  { widthMm: 210, heightMm: 297, displayName: 'A4 210 × 297 mm' },
  { widthMm: 297, heightMm: 210, displayName: 'A4 landscape 297 × 210 mm' },
] as const;

export const LABEL_MM_MIN = 10;
export const LABEL_MM_MAX = 297;

export function labelSizeKey(widthMm: number, heightMm: number): string {
  return `${widthMm}x${heightMm}`;
}

export function parseLabelSizeKey(
  value: string,
): { widthMm: number; heightMm: number } | undefined {
  const parts = value.split('x');
  if (parts.length !== 2) {
    return undefined;
  }
  const widthMm = Number(parts[0]);
  const heightMm = Number(parts[1]);
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm) || widthMm <= 0 || heightMm <= 0) {
    return undefined;
  }
  return { widthMm, heightMm };
}

export function clampLabelMm(value: number): number {
  if (!Number.isFinite(value)) {
    return LABEL_MM_MIN;
  }
  return Math.min(LABEL_MM_MAX, Math.max(LABEL_MM_MIN, Math.round(value * 10) / 10));
}

export function labelSizeRecord(
  widthMm: number,
  heightMm: number,
): { widthMm: number; heightMm: number; displayName: string } {
  const known = DEFAULT_LABEL_SIZES.find(
    (size) => size.widthMm === widthMm && size.heightMm === heightMm,
  );
  return {
    widthMm,
    heightMm,
    displayName: known?.displayName ?? `${widthMm} × ${heightMm} mm`,
  };
}
