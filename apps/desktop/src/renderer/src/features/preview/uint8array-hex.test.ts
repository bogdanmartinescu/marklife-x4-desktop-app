import { describe, expect, it } from 'vitest';
import { bytesToHex, installUint8ArrayHex } from './uint8array-hex.js';

describe('bytesToHex', () => {
  it('encodes bytes as lowercase hex', () => {
    expect(bytesToHex(new Uint8Array([255, 0, 16]))).toBe('ff0010');
  });
});

describe('installUint8ArrayHex', () => {
  it('adds toHex on Uint8Array when the runtime does not provide it', () => {
    const proto = Uint8Array.prototype as Uint8Array & { toHex?: () => string };
    const original = proto.toHex;
    try {
      delete proto.toHex;
      installUint8ArrayHex();
      const toHex = proto.toHex as ((this: Uint8Array) => string) | undefined;
      expect(typeof toHex).toBe('function');
      expect(toHex?.call(new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255]))).toBe(
        'ffffffffffffffff',
      );
    } finally {
      if (original) {
        proto.toHex = original;
      } else {
        delete proto.toHex;
      }
    }
  });
});
