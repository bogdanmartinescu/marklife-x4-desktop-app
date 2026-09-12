const NAMED: ReadonlyArray<{ widthMm: number; heightMm: number; name: string }> = [
  { widthMm: 210, heightMm: 297, name: 'A4' },
  { widthMm: 148, heightMm: 210, name: 'A5' },
  { widthMm: 105, heightMm: 148, name: 'A6' },
  { widthMm: 215.9, heightMm: 279.4, name: 'Letter' },
  { widthMm: 215.9, heightMm: 355.6, name: 'Legal' },
];

function nearly(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.6;
}

export function cupsMediaName(widthMm: number, heightMm: number): string {
  for (const size of NAMED) {
    if (
      (nearly(widthMm, size.widthMm) && nearly(heightMm, size.heightMm)) ||
      (nearly(widthMm, size.heightMm) && nearly(heightMm, size.widthMm))
    ) {
      return size.name;
    }
  }
  return `${Math.round(widthMm)}x${Math.round(heightMm)}mm`;
}
