import { describe, expect, it } from 'vitest';
import { packBits } from '../../../src/bitmap/pack-bits.js';
import { TsplJobBuilder } from '../../../src/languages/tspl/job-builder.js';

function ascii(value: string): number[] {
  return Array.from(new TextEncoder().encode(value));
}

describe('TsplJobBuilder', () => {
  it('emits exact golden bytes for a full job with a BITMAP payload', () => {
    const bitmap = packBits(new Uint8Array(8).fill(1), 8, 1);
    const bytes = new TsplJobBuilder()
      .sizeMm(100, 150)
      .gapMm(2, 0)
      .reference(0, 0)
      .offsetMm(0)
      .density(10)
      .speed(4)
      .direction(0, 0)
      .clear()
      .bitmap({ x: 0, y: 0, bitmap })
      .print(1, 1)
      .encode();

    const header = [
      'SIZE 100 mm,150 mm\r\n',
      'GAP 2 mm,0 mm\r\n',
      'REFERENCE 0,0\r\n',
      'OFFSET 0 mm\r\n',
      'DENSITY 10\r\n',
      'SPEED 4\r\n',
      'DIRECTION 0,0\r\n',
      'CLS\r\n',
      'BITMAP 0,0,1,1,1,',
    ].join('');

    expect(Array.from(bytes)).toEqual([
      ...ascii(header),
      0xff,
      ...ascii('\r\nPRINT 1,1\r\n'),
    ]);
  });

  it('emits commands in SIZE → media → REFERENCE → OFFSET → DENSITY → SPEED → DIRECTION → CLS → BITMAP → PRINT order', () => {
    const bitmap = packBits(new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0]), 8, 1);
    const text = new TextDecoder('latin1').decode(
      new TsplJobBuilder()
        .sizeMm(50, 30)
        .continuous()
        .reference(1, 2)
        .offsetMm(1)
        .density(15)
        .speed(2)
        .direction(1, 0)
        .clear()
        .bitmap({ x: 4, y: 8, bitmap })
        .print(1, 3)
        .encode(),
    );

    expect(text.indexOf('SIZE 50 mm,30 mm')).toBe(0);
    expect(text.indexOf('GAP 0,0')).toBeGreaterThan(text.indexOf('SIZE'));
    expect(text.indexOf('REFERENCE 1,2')).toBeGreaterThan(text.indexOf('GAP 0,0'));
    expect(text.indexOf('OFFSET 1 mm')).toBeGreaterThan(text.indexOf('REFERENCE'));
    expect(text.indexOf('DENSITY 15')).toBeGreaterThan(text.indexOf('OFFSET'));
    expect(text.indexOf('SPEED 2')).toBeGreaterThan(text.indexOf('DENSITY'));
    expect(text.indexOf('DIRECTION 1,0')).toBeGreaterThan(text.indexOf('SPEED'));
    expect(text.indexOf('CLS')).toBeGreaterThan(text.indexOf('DIRECTION'));
    expect(text.indexOf('BITMAP 4,8,1,1,1,')).toBeGreaterThan(text.indexOf('CLS'));
    expect(text.indexOf('PRINT 1,3')).toBeGreaterThan(text.indexOf('BITMAP'));
  });

  it('writes BLINE for black-mark media', () => {
    const bytes = new TsplJobBuilder().blineMm(3, 1).encode();
    expect(new TextDecoder().decode(bytes)).toBe('BLINE 3 mm,1 mm\r\n');
  });
});
