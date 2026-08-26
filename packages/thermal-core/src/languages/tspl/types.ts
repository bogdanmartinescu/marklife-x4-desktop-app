import { z } from 'zod';
import { DEFAULT_BITMAP_ENCODING, type BitmapEncoding } from '../../bitmap/types.js';

export const BitmapEncodingSchema = z.object({
  bitOrder: z.enum(['msb-first', 'lsb-first']),
  blackBit: z.union([z.literal(0), z.literal(1)]),
  rowAlignmentBytes: z.number().int().positive(),
  tsplMode: z.number().int(),
});

export const MediaSettingsSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('continuous'),
  }),
  z.object({
    mode: z.literal('gap'),
    gapHeightMm: z.number().finite(),
    gapOffsetMm: z.number().finite(),
  }),
  z.object({
    mode: z.literal('black-mark'),
    markHeightMm: z.number().finite(),
    markOffsetMm: z.number().finite(),
  }),
]);

export type MediaSettings = z.infer<typeof MediaSettingsSchema>;

export const TsplJobOptionsSchema = z.object({
  widthMm: z.number().positive().optional(),
  heightMm: z.number().positive().optional(),
  density: z.number().int().min(0).max(15).optional(),
  speed: z.number().positive().optional(),
  copies: z.number().int().positive().optional(),
  encoding: BitmapEncodingSchema.optional(),
});

export type TsplJobOptions = z.infer<typeof TsplJobOptionsSchema>;

export function defaultBitmapEncoding(): BitmapEncoding {
  return { ...DEFAULT_BITMAP_ENCODING };
}
