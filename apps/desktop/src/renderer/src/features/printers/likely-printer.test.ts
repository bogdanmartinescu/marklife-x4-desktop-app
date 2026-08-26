import { describe, expect, it } from 'vitest';
import type { PrinterInfo } from '@thermalbridge/shared';
import { isLikelyPrinterName, sortLikelyPrintersFirst } from './likely-printer.js';

describe('isLikelyPrinterName', () => {
  it('recognizes Marklife and model names', () => {
    expect(isLikelyPrinterName('Marklife-X4-Serial')).toBe(true);
    expect(isLikelyPrinterName('D210')).toBe(true);
    expect(isLikelyPrinterName('P50 BLE')).toBe(true);
    expect(isLikelyPrinterName('AirPods Pro')).toBe(false);
  });
});

describe('sortLikelyPrintersFirst', () => {
  it('puts likely printers ahead of unrelated BLE devices', () => {
    const devices: PrinterInfo[] = [
      {
        id: 'bt-ble:bb',
        name: 'Watch',
        systemName: 'bb',
        isDefault: false,
        status: 'ready',
        backend: 'bluetooth-ble',
      },
      {
        id: 'bt-ble:aa',
        name: 'Marklife X4',
        systemName: 'aa',
        isDefault: false,
        status: 'ready',
        backend: 'bluetooth-ble',
      },
    ];
    expect(sortLikelyPrintersFirst(devices).map((item) => item.name)).toEqual([
      'Marklife X4',
      'Watch',
    ]);
  });
});
