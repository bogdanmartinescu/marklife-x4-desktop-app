import { describe, expect, it } from 'vitest';
import { DEFAULT_D210_PRINT_SETTINGS } from '@thermalbridge/printer-profiles';
import type { PrintDraft } from '@/state/types.js';
import { formatByteSize, printHistoryInput } from './print-history.js';

const DRAFT: PrintDraft = {
  printerId: 'bt-ble:aa',
  profileId: 'phomemo-m110',
  widthMm: 40,
  heightMm: 30,
  mediaMode: 'gap',
  gapHeightMm: 2,
  gapOffsetMm: 0,
  markHeightMm: 3,
  markOffsetMm: 0,
  density: 8,
  speed: 4,
  copies: 2,
  dither: 'threshold',
  threshold: 128,
  rotation: 0,
  fitMode: 'actual',
  mirrorX: false,
  mirrorY: false,
  negative: false,
  offsetXmm: 0.5,
  offsetYmm: 0,
  diagnosticTsplOverSpp: false,
  d210: DEFAULT_D210_PRINT_SETTINGS,
};

describe('printHistoryInput', () => {
  it('copies print settings onto a history payload', () => {
    const png = new Uint8Array([1, 2, 3]);
    const input = printHistoryInput({
      jobName: 'Label 1/1',
      printerName: 'M110',
      draft: DRAFT,
      widthMm: 40,
      heightMm: 30,
      width: 320,
      height: 240,
      dpi: 203,
      copies: 1,
      png,
    });
    expect(input.jobName).toBe('Label 1/1');
    expect(input.printerId).toBe('bt-ble:aa');
    expect(input.printerName).toBe('M110');
    expect(input.widthMm).toBe(40);
    expect(input.copies).toBe(1);
    expect(input.offsetXmm).toBe(0.5);
    expect(input.png).toBe(png);
  });
});

describe('formatByteSize', () => {
  it('formats bytes, kilobytes, and megabytes', () => {
    expect(formatByteSize(200)).toBe('200 B');
    expect(formatByteSize(2048)).toBe('2.0 KB');
    expect(formatByteSize(2 * 1024 * 1024)).toBe('2.0 MB');
  });
});
