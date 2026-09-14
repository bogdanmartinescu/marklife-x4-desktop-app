import { describe, expect, it } from 'vitest';
import { DEFAULT_D210_PRINT_SETTINGS } from '@thermalbridge/printer-profiles';
import type { PrintDraft } from '@/state/types.js';
import type { PrintHistoryMeta } from '@thermalbridge/shared';
import {
  filterHistoryItems,
  formatWhen,
  groupHistoryItems,
  historyDayKey,
  printHistoryInput,
  formatByteSize,
} from './print-history.js';

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

function historyItem(patch: Partial<PrintHistoryMeta> & Pick<PrintHistoryMeta, 'id' | 'jobName' | 'printedAt'>): PrintHistoryMeta {
  return {
    printerId: 'bt-ble:aa',
    printerName: 'M110',
    profileId: 'phomemo-m110',
    widthMm: 40,
    heightMm: 30,
    width: 320,
    height: 240,
    dpi: 203,
    copies: 1,
    density: 8,
    speed: 4,
    mediaMode: 'gap',
    gapHeightMm: 2,
    gapOffsetMm: 0,
    markHeightMm: 3,
    markOffsetMm: 0,
    dither: 'threshold',
    threshold: 128,
    rotation: 0,
    mirrorX: false,
    mirrorY: false,
    negative: false,
    offsetXmm: 0,
    offsetYmm: 0,
    fitMode: 'actual',
    ...patch,
  };
}

describe('formatWhen', () => {
  it('returns the raw string for invalid dates', () => {
    expect(formatWhen('not-a-date', 'en')).toBe('not-a-date');
  });

  it('formats a valid timestamp', () => {
    expect(formatWhen('2026-03-15T10:30:00.000Z', 'en')).toContain('2026');
  });
});

describe('historyDayKey', () => {
  const now = new Date(2026, 2, 15, 15);

  it('labels today, yesterday, and older days', () => {
    expect(historyDayKey(new Date(2026, 2, 15, 8).toISOString(), now)).toBe('today');
    expect(historyDayKey(new Date(2026, 2, 14, 22).toISOString(), now)).toBe('yesterday');
    expect(historyDayKey(new Date(2026, 2, 10, 12).toISOString(), now)).toBe('2026-03-10');
    expect(historyDayKey('not-a-date', now)).toBe('not-a-date');
  });
});

describe('filterHistoryItems', () => {
  const items = [
    historyItem({ id: 'a', jobName: 'AWB 1/2', printedAt: '2026-03-15T10:00:00.000Z', printerName: 'X4' }),
    historyItem({ id: 'b', jobName: 'Shipping', printedAt: '2026-03-14T10:00:00.000Z', printerName: 'M110' }),
  ];

  it('filters by job name or printer, and returns all when the query is empty', () => {
    expect(filterHistoryItems(items, '').map((item) => item.id)).toEqual(['a', 'b']);
    expect(filterHistoryItems(items, '  awb  ').map((item) => item.id)).toEqual(['a']);
    expect(filterHistoryItems(items, 'm110').map((item) => item.id)).toEqual(['b']);
  });
});

describe('groupHistoryItems', () => {
  it('groups newest-first items by local day', () => {
    const now = new Date(2026, 2, 15, 15);
    const items = [
      historyItem({ id: 'a', jobName: 'A', printedAt: new Date(2026, 2, 15, 12).toISOString() }),
      historyItem({ id: 'b', jobName: 'B', printedAt: new Date(2026, 2, 15, 9).toISOString() }),
      historyItem({ id: 'c', jobName: 'C', printedAt: new Date(2026, 2, 14, 18).toISOString() }),
    ];
    expect(groupHistoryItems(items, now).map((group) => [group.key, group.items.map((item) => item.id)])).toEqual([
      ['today', ['a', 'b']],
      ['yesterday', ['c']],
    ]);
  });
});
