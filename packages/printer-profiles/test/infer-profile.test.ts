import { describe, expect, it } from 'vitest';
import { inferPrinterProfile } from '../src/infer-profile.js';

describe('inferPrinterProfile', () => {
  it('selects the M110 profile for Phomemo BLE serial names', () => {
    expect(
      inferPrinterProfile({ name: 'Q002E0CP0670069', backend: 'bluetooth-ble' }),
    ).toBe('phomemo-m110');
    expect(
      inferPrinterProfile({ name: 'M110-ABCD', backend: 'bluetooth-ble' }),
    ).toBe('phomemo-m110');
  });

  it('selects the M110 profile for the Q-serial advertisement', () => {
    expect(
      inferPrinterProfile({ name: 'Q199E4BC7300007', backend: 'bluetooth-ble' }),
    ).toBe('phomemo-m110');
  });

  it('maps Marklife advertised names to their own profiles, not Phomemo', () => {
    expect(inferPrinterProfile({ name: 'X4', backend: 'bluetooth-ble' })).toBe('marklife-x4');
    expect(
      inferPrinterProfile({ name: 'Marklife X4', backend: 'bluetooth-ble' }),
    ).toBe('marklife-x4');
    expect(
      inferPrinterProfile({ name: 'D210-ABCD', backend: 'bluetooth-ble' }),
    ).toBe('marklife-d210');
    expect(
      inferPrinterProfile({ name: 'P50R', backend: 'bluetooth-ble' }),
    ).toBe('marklife-p50');
  });
});
