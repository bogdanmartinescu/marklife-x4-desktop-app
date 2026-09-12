/** Observed on X4_05A1 (2026-09-11): printer UART next to Marklife ff00 and ISSC 49535343. */
export const X4_BLE_PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
export const X4_BLE_PRINTER_RX_CHAR_UUID = '00002af0-0000-1000-8000-00805f9b34fb';
export const X4_BLE_PRINTER_TX_CHAR_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

export function x4BleWriteTarget(): {
  btServiceUuid: string;
  btTxCharUuid: string;
} {
  return {
    btServiceUuid: X4_BLE_PRINTER_SERVICE_UUID,
    btTxCharUuid: X4_BLE_PRINTER_TX_CHAR_UUID,
  };
}
