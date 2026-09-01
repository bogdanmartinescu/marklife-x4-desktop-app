import { describe, expect, it } from 'vitest';
import {
  parseTableCells,
  resizeTableCells,
  serializeTableCells,
  tableCellBounds,
} from './table-cells.js';

describe('table cells', () => {
  it('parses rows and columns from tab-separated text', () => {
    expect(parseTableCells('A\tB\nC\tD', 2, 2)).toEqual([
      ['A', 'B'],
      ['C', 'D'],
    ]);
  });

  it('pads missing cells', () => {
    expect(parseTableCells('A', 2, 2)).toEqual([
      ['A', ''],
      ['', ''],
    ]);
  });

  it('serializes cells back to tab-separated rows', () => {
    expect(serializeTableCells([
      ['A', 'B'],
      ['C', 'D'],
    ])).toBe('A\tB\nC\tD');
  });

  it('resizes a table while keeping overlapping values', () => {
    expect(resizeTableCells([['A', 'B'], ['C', 'D']], 3, 1)).toEqual([['A'], ['C'], ['']]);
  });

  it('lays out cell rectangles', () => {
    expect(tableCellBounds(100, 40, 2, 2)).toEqual([
      { x: 0, y: 0, width: 50, height: 20, row: 0, col: 0 },
      { x: 50, y: 0, width: 50, height: 20, row: 0, col: 1 },
      { x: 0, y: 20, width: 50, height: 20, row: 1, col: 0 },
      { x: 50, y: 20, width: 50, height: 20, row: 1, col: 1 },
    ]);
  });
});
