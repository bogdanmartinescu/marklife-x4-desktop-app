import { describe, expect, it } from 'vitest';
import { BinaryWriter } from '../../../src/languages/tspl/encoder.js';

function ascii(value: string): number[] {
  return Array.from(new TextEncoder().encode(value));
}

describe('BinaryWriter', () => {
  it('round-trips ASCII text without mutation', () => {
    const writer = new BinaryWriter();
    writer.text('SIZE 100 mm,150 mm\r\n');
    expect(Array.from(writer.concat())).toEqual(ascii('SIZE 100 mm,150 mm\r\n'));
  });

  it('preserves binary bytes that are invalid UTF-8', () => {
    const writer = new BinaryWriter();
    writer.bytes(new Uint8Array([0xff, 0xfe, 0x00, 0x80, 0xc0]));
    expect(Array.from(writer.concat())).toEqual([0xff, 0xfe, 0x00, 0x80, 0xc0]);
  });

  it('interleaves text and binary without UTF-8 corruption', () => {
    const writer = new BinaryWriter();
    writer.text('BITMAP 0,0,1,1,1,');
    writer.bytes(new Uint8Array([0xff]));
    writer.text('\r\n');
    expect(Array.from(writer.concat())).toEqual([
      ...ascii('BITMAP 0,0,1,1,1,'),
      0xff,
      0x0d,
      0x0a,
    ]);
  });

  it('does not encode 0xFF through a JS string (which would become UTF-8 C3 BF)', () => {
    const writer = new BinaryWriter();
    writer.bytes(new Uint8Array([0xff]));
    const bytes = writer.concat();
    expect(bytes.length).toBe(1);
    expect(bytes[0]).toBe(0xff);
  });
});
