import { describe, expect, it } from 'vitest';
import { installMapGetOrInsertComputed } from './pdfjs-polyfills.js';

describe('installMapGetOrInsertComputed', () => {
  it('computes a value once and returns the stored entry', () => {
    const proto = Map.prototype as Map<string, number> & {
      getOrInsertComputed?: (key: string, fn: (key: string) => number) => number;
    };
    const original = proto.getOrInsertComputed;
    delete proto.getOrInsertComputed;
    try {
      installMapGetOrInsertComputed();
      const map = new Map<string, number>();
      let calls = 0;
      const getOrInsertComputed = proto.getOrInsertComputed as
        | ((this: Map<string, number>, key: string, fn: (key: string) => number) => number)
        | undefined;
      const first = getOrInsertComputed?.call(map, 'page', () => {
        calls += 1;
        return 7;
      });
      const second = getOrInsertComputed?.call(map, 'page', () => {
        calls += 1;
        return 99;
      });
      expect(first).toBe(7);
      expect(second).toBe(7);
      expect(calls).toBe(1);
    } finally {
      if (original) {
        proto.getOrInsertComputed = original;
      } else {
        delete proto.getOrInsertComputed;
      }
    }
  });
});
