import { describe, expect, it } from 'vitest';
import type { PrinterInfo } from '@thermalbridge/shared';
import {
  BLE_GRACE_MS,
  devicesFromSightings,
  rememberBleSightings,
  type BleSighting,
} from './ble-sightings.js';

function ble(id: string, name = id): PrinterInfo {
  return {
    id,
    name,
    systemName: id,
    isDefault: false,
    status: 'ready',
    backend: 'bluetooth-ble',
    btAddress: id.replace('bt-ble:', ''),
  };
}

describe('rememberBleSightings', () => {
  it('keeps a printer that missed one scan and marks it unknown', () => {
    const first = rememberBleSightings([], [ble('bt-ble:aa')], 1_000);
    const next = rememberBleSightings(first, [], 1_000 + 5_000);
    expect(next).toHaveLength(1);
    expect(next[0]?.device.status).toBe('unknown');
    expect(next[0]?.lastSeenAt).toBe(1_000);
  });

  it('drops a printer after the grace period', () => {
    const first = rememberBleSightings([], [ble('bt-ble:aa')], 1_000);
    const next = rememberBleSightings(first, [], 1_000 + BLE_GRACE_MS + 1);
    expect(next).toHaveLength(0);
  });

  it('refreshes last-seen time and ready status when the printer returns', () => {
    const missed: BleSighting[] = [
      { device: { ...ble('bt-ble:aa'), status: 'unknown' }, lastSeenAt: 1_000 },
    ];
    const next = rememberBleSightings(missed, [ble('bt-ble:aa')], 8_000);
    expect(next[0]?.lastSeenAt).toBe(8_000);
    expect(next[0]?.device.status).toBe('ready');
  });

  it('exposes devices for the catalog', () => {
    const sightings = rememberBleSightings([], [ble('bt-ble:aa', 'X4')], 1_000);
    expect(devicesFromSightings(sightings).map((item) => item.name)).toEqual(['X4']);
  });
});
