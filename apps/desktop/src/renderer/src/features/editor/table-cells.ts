export function parseTableCells(text: string, rows: number, cols: number): string[][] {
  const safeRows = Math.max(1, Math.round(rows));
  const safeCols = Math.max(1, Math.round(cols));
  const lines = text.split('\n');
  const cells: string[][] = [];
  for (let row = 0; row < safeRows; row += 1) {
    const parts = (lines[row] ?? '').split('\t');
    const next: string[] = [];
    for (let col = 0; col < safeCols; col += 1) {
      next.push(parts[col] ?? '');
    }
    cells.push(next);
  }
  return cells;
}

export function serializeTableCells(cells: string[][]): string {
  return cells.map((row) => row.join('\t')).join('\n');
}

export function resizeTableCells(cells: string[][], rows: number, cols: number): string[][] {
  return parseTableCells(serializeTableCells(cells), rows, cols);
}

export function tableCellBounds(
  width: number,
  height: number,
  rows: number,
  cols: number,
): Array<{ x: number; y: number; width: number; height: number; row: number; col: number }> {
  const safeRows = Math.max(1, Math.round(rows));
  const safeCols = Math.max(1, Math.round(cols));
  const cellWidth = width / safeCols;
  const cellHeight = height / safeRows;
  const bounds: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    row: number;
    col: number;
  }> = [];
  for (let row = 0; row < safeRows; row += 1) {
    for (let col = 0; col < safeCols; col += 1) {
      bounds.push({
        x: col * cellWidth,
        y: row * cellHeight,
        width: cellWidth,
        height: cellHeight,
        row,
        col,
      });
    }
  }
  return bounds;
}
