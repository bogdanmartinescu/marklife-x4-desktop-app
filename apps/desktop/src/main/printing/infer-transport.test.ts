import { describe, expect, it } from 'vitest';
import { inferTransport } from './infer-transport.js';

describe('inferTransport', () => {
  it('prefers the saved binding backend', () => {
    expect(inferTransport('cups:Office', 'bluetooth-spp')).toBe('bluetooth-spp');
  });

  it('infers SPP and BLE from printer ids without treating BLE as a print protocol', () => {
    expect(inferTransport('bt-spp:/dev/cu.X4', undefined)).toBe('bluetooth-spp');
    expect(inferTransport('bt-ble:aa:bb', undefined)).toBe('bluetooth-ble');
    expect(inferTransport('usb:1234:5678:0', undefined)).toBe('usb');
  });
});
