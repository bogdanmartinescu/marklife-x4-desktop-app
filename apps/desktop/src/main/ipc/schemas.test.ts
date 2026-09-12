import { describe, expect, it } from 'vitest';
import { BleScanSchema, PrintRequestSchema } from './schemas.js';

describe('PrintRequestSchema', () => {
  it('requires rgba as Uint8Array', () => {
    const base = {
      width: 8,
      height: 8,
      rgba: new Uint8Array(256),
      widthMm: 40,
      heightMm: 30,
      dpi: 203,
      density: 14,
      speed: 4,
      copies: 1,
      mediaMode: 'gap',
      gapHeightMm: 2,
      gapOffsetMm: 0,
      markHeightMm: 0,
      markOffsetMm: 0,
      dither: 'threshold',
      threshold: 128,
      rotation: 0,
      mirrorX: false,
      mirrorY: false,
      negative: false,
      offsetXmm: 0,
      offsetYmm: 0,
      fitMode: 'fit',
      printerId: 'cups:x',
      jobName: 'job',
    };
    expect(PrintRequestSchema.safeParse(base).success).toBe(true);
    expect(PrintRequestSchema.safeParse({ ...base, rgba: [0, 1] }).success).toBe(false);
  });
});

describe('BleScanSchema', () => {
  it('caps scan duration at 30 seconds', () => {
    expect(BleScanSchema.safeParse({ durationMs: 5_000 }).success).toBe(true);
    expect(BleScanSchema.safeParse({ durationMs: 60_000 }).success).toBe(false);
  });
});
