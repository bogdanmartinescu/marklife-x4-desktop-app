import { describe, expect, it } from 'vitest';
import { applyThreshold } from '../../../src/bitmap/threshold.js';
import { X4_BLUETOOTH_HEADER_FIELDS } from '../../../src/languages/marklife/x4-bluetooth/header.js';
import {
  X4_BT_GRAYSCALE_PARAMETER,
  applyX4BluetoothThreshold,
  encodeX4BluetoothJob,
} from '../../../src/languages/marklife/x4-bluetooth/encoder.js';

describe('X4 Bluetooth protocol 7', () => {
  it('scopes grayscale parameter 135 to the X4 Bluetooth pipeline', () => {
    expect(X4_BT_GRAYSCALE_PARAMETER).toBe(135);
    const below = applyX4BluetoothThreshold(Uint8Array.of(134));
    const at = applyX4BluetoothThreshold(Uint8Array.of(135));
    expect(below[0]).toBe(1);
    expect(at[0]).toBe(0);
  });

  it('does not emit a wire job until getHeader and JBIG framing are verified', async () => {
    await expect(
      encodeX4BluetoothJob({
        width: 8,
        height: 8,
        gray: new Uint8Array(64).fill(0),
        paperType: 0,
        density: 14,
        copies: 1,
      }),
    ).rejects.toMatchObject({
      name: 'ProtocolUnimplementedError',
      protocolId: 'marklife-x4-bt-v7',
    });
  });

  it('does not instruct a silent TSPL fallback in the unimplemented error', async () => {
    await expect(
      encodeX4BluetoothJob({
        width: 8,
        height: 8,
        gray: new Uint8Array(64).fill(0),
        paperType: 0,
        density: 14,
        copies: 1,
      }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/does not fall back to TSPL/i),
    });
  });

  it('does not use 135 as the global raster threshold', () => {
    expect(Array.from(applyThreshold(Uint8Array.of(134, 135)))).toEqual([0, 0]);
    expect(Array.from(applyX4BluetoothThreshold(Uint8Array.of(134, 135)))).toEqual([1, 0]);
  });

  it('keeps unverified X4 Bluetooth header bytes unnamed instead of inventing a layout', () => {
    expect(X4_BLUETOOTH_HEADER_FIELDS.some((field) => field.name === 'unknownXX')).toBe(true);
  });
});
