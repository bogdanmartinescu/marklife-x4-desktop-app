import { z } from 'zod';

export const PrintRequestSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  rgba: z.custom<Uint8Array>((value) => value instanceof Uint8Array, {
    message: 'rgba must be Uint8Array',
  }),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  dpi: z.number().positive(),
  density: z.number().int().min(0).max(15),
  speed: z.number().positive(),
  copies: z.number().int().positive(),
  mediaMode: z.enum(['continuous', 'gap', 'black-mark']),
  gapHeightMm: z.number().finite(),
  gapOffsetMm: z.number().finite(),
  markHeightMm: z.number().finite(),
  markOffsetMm: z.number().finite(),
  dither: z.enum(['threshold', 'floyd-steinberg']),
  threshold: z.number().int().min(0).max(255),
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  mirrorX: z.boolean(),
  mirrorY: z.boolean(),
  negative: z.boolean(),
  offsetXmm: z.number().finite(),
  offsetYmm: z.number().finite(),
  fitMode: z.enum(['fit', 'fill', 'actual', 'stretch']),
  printerId: z.string().min(1),
  jobName: z.string().min(1),
  profileId: z.string().min(1).optional(),
  diagnosticRoute: z.literal('x4-spp-raw-tspl').optional(),
});

export const TestPrintRequestSchema = z.object({
  printerId: z.string().min(1),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  dpi: z.number().positive(),
  density: z.number().int().min(0).max(15),
  speed: z.number().positive(),
  mediaMode: z.enum(['continuous', 'gap', 'black-mark']),
  gapHeightMm: z.number().finite(),
  gapOffsetMm: z.number().finite(),
  profileId: z.string().min(1).optional(),
  diagnosticRoute: z.literal('x4-spp-raw-tspl').optional(),
});

export const BleScanSchema = z.object({
  durationMs: z.number().int().positive().max(30_000),
});
