import { describe, expect, it } from 'vitest';
import { bleSignalBars } from './ble-signal.js';

describe('bleSignalBars', () => {
  it('maps RSSI to 0–4 bars', () => {
    expect(bleSignalBars(undefined)).toBe(0);
    expect(bleSignalBars(-40)).toBe(4);
    expect(bleSignalBars(-58)).toBe(3);
    expect(bleSignalBars(-70)).toBe(2);
    expect(bleSignalBars(-82)).toBe(1);
    expect(bleSignalBars(-95)).toBe(1);
  });
});
