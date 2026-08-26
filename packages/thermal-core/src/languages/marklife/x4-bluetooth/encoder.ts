import { applyThreshold } from '../../../bitmap/threshold.js';

export const X4_BT_GRAYSCALE_PARAMETER = 135 as const;

export type X4BluetoothJobInput = {
  width: number;
  height: number;
  gray: Uint8Array;
  paperType: number;
  density: number;
  copies: number;
};

export class ProtocolUnimplementedError extends Error {
  readonly protocolId = 'marklife-x4-bt-v7' as const;

  constructor(message: string) {
    super(message);
    this.name = 'ProtocolUnimplementedError';
  }
}

/**
 * 1-bit conversion used only by the X4 Bluetooth / protocol-7 pipeline.
 * Desktop TSPL raster keeps its own default threshold (128).
 */
export function applyX4BluetoothThreshold(gray: Uint8Array): Uint8Array {
  return applyThreshold(gray, X4_BT_GRAYSCALE_PARAMETER);
}

/**
 * X4 Bluetooth protocol 7 is not wire-complete. Do not invent header bytes.
 * Reconstruct `X4Protocol.getHeader()` field-by-field, then validate an
 * independent JBIG T.85 encoder, before this function returns a job.
 */
export async function encodeX4BluetoothJob(_input: X4BluetoothJobInput): Promise<Uint8Array> {
  throw new ProtocolUnimplementedError(
    'Marklife X4 Bluetooth protocol 7 is not wire-complete. X4Protocol.getHeader() and JBIG T.85 framing are unverified. This route does not fall back to TSPL.',
  );
}
