import { describe, expect, it } from 'vitest';
import {
  blineCommand,
  clearCommand,
  continuousCommand,
  densityCommand,
  encodeMedia,
  gapCommand,
  printCommand,
  sizeCommand,
} from '../../../src/languages/tspl/commands.js';

describe('TSPL commands', () => {
  it('encodes size, gap, and density', () => {
    expect(sizeCommand(100, 150)).toBe('SIZE 100 mm,150 mm\r\n');
    expect(gapCommand(2, 0)).toBe('GAP 2 mm,0 mm\r\n');
    expect(densityCommand(14)).toBe('DENSITY 14\r\n');
    expect(clearCommand()).toBe('CLS\r\n');
    expect(printCommand(1, 2)).toBe('PRINT 1,2\r\n');
  });

  it('selects GAP 0,0 for continuous and BLINE for black-mark', () => {
    expect(encodeMedia({ mode: 'continuous' })).toBe(continuousCommand());
    expect(encodeMedia({ mode: 'black-mark', markHeightMm: 3, markOffsetMm: 1 })).toBe(
      blineCommand(3, 1),
    );
  });

  it('rejects a non-finite size', () => {
    expect(() => sizeCommand(Number.NaN, 150)).toThrow(/widthMm/);
  });
});
