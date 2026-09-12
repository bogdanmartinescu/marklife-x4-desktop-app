import { describe, expect, it } from 'vitest';
import { selectPrintableProfile } from '../src/select-profile.js';

describe('selectPrintableProfile', () => {
  it('does not encode a Phomemo BLE printer with the X4 protocol', () => {
    expect(
      selectPrintableProfile({
        transport: 'bluetooth-ble',
        requestedModelId: 'marklife-x4',
        boundModelId: 'marklife-x4',
        deviceName: 'Q199E4BC7300007',
      }),
    ).toBe('phomemo-m110');
  });

  it('keeps an explicit M110 profile on BLE', () => {
    expect(
      selectPrintableProfile({
        transport: 'bluetooth-ble',
        requestedModelId: 'phomemo-m110',
        deviceName: 'Q199E4BC7300007',
      }),
    ).toBe('phomemo-m110');
  });

  it('uses the bound Phomemo profile when the UI still says X4', () => {
    expect(
      selectPrintableProfile({
        transport: 'bluetooth-ble',
        requestedModelId: 'marklife-x4',
        boundModelId: 'phomemo-m110',
        deviceName: 'Q199E4BC7300007',
      }),
    ).toBe('phomemo-m110');
  });

  it('keeps X4 on CUPS where that model has a TSPL route', () => {
    expect(
      selectPrintableProfile({
        transport: 'cups',
        requestedModelId: 'marklife-x4',
      }),
    ).toBe('marklife-x4');
  });

  it('does not invent an X4 BLE route when the device is unknown', () => {
    expect(
      selectPrintableProfile({
        transport: 'bluetooth-ble',
        requestedModelId: 'marklife-x4',
      }),
    ).toBe('marklife-x4');
  });

  it('selects X4 for an X4_ BLE advertisement', () => {
    expect(
      selectPrintableProfile({
        transport: 'bluetooth-ble',
        deviceName: 'X4_05A1',
      }),
    ).toBe('marklife-x4');
  });
});
