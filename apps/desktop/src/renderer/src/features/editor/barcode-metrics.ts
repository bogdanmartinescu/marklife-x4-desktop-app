export interface BarcodeDrawMetrics {
  moduleWidth: number;
  barHeight: number;
  fontSize: number;
  textMargin: number;
  quietLeft: number;
  quietRight: number;
}

/** Layout a 1-D barcode inside a destination box without non-uniform stretch. */
export function barcodeDrawMetrics(
  destWidth: number,
  destHeight: number,
  moduleCount: number,
  displayValue: boolean,
): BarcodeDrawMetrics {
  const destW = Math.max(8, Math.round(destWidth));
  const destH = Math.max(8, Math.round(destHeight));
  const textBlock = displayValue
    ? Math.max(0, Math.min(Math.round(destH * 0.28), destH - 8))
    : 0;
  const textMargin = displayValue && textBlock > 0 ? Math.max(1, Math.round(textBlock * 0.15)) : 0;
  const fontSize = Math.max(0, textBlock - textMargin);
  const barHeight = Math.max(1, destH - textBlock);
  const modules = Math.max(1, Math.round(moduleCount));
  let moduleWidth = Math.max(1, Math.floor(destW / modules));
  if (moduleWidth > 1 && moduleWidth * modules > destW - 4) {
    moduleWidth -= 1;
  }
  const used = moduleWidth * modules;
  const extra = Math.max(0, destW - used);
  const quietLeft = Math.floor(extra / 2);
  const quietRight = extra - quietLeft;
  return { moduleWidth, barHeight, fontSize, textMargin, quietLeft, quietRight };
}
