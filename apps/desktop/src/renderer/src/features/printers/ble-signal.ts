export type BleSignalLevel = 0 | 1 | 2 | 3 | 4;

export function bleSignalBars(rssi: number | undefined): BleSignalLevel {
  if (rssi === undefined || !Number.isFinite(rssi)) {
    return 0;
  }
  if (rssi >= -50) {
    return 4;
  }
  if (rssi >= -65) {
    return 3;
  }
  if (rssi >= -75) {
    return 2;
  }
  return 1;
}
