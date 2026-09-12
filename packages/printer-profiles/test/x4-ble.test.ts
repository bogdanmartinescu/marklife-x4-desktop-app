import { describe, expect, it } from 'vitest';
import {
  X4_BLE_PRINTER_RX_CHAR_UUID,
  X4_BLE_PRINTER_SERVICE_UUID,
  X4_BLE_PRINTER_TX_CHAR_UUID,
  x4BleWriteTarget,
} from '../src/x4-ble.js';

describe('X4 BLE write target', () => {
  it('writes TSPL to the 18f0 / 2af1 printer UART observed on X4_05A1', () => {
    expect(x4BleWriteTarget()).toEqual({
      btServiceUuid: X4_BLE_PRINTER_SERVICE_UUID,
      btTxCharUuid: X4_BLE_PRINTER_TX_CHAR_UUID,
    });
    expect(X4_BLE_PRINTER_SERVICE_UUID).toContain('18f0');
    expect(X4_BLE_PRINTER_TX_CHAR_UUID).toContain('2af1');
    expect(X4_BLE_PRINTER_RX_CHAR_UUID).toContain('2af0');
    expect(X4_BLE_PRINTER_TX_CHAR_UUID).not.toContain('ff02');
  });
});
