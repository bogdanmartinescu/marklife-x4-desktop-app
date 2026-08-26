export type Millimeters = number;
export type Dots = number;
export type Dpi = number;

export function mmToDots(mm: Millimeters, dpi: Dpi): Dots {
  return Math.round((mm / 25.4) * dpi);
}

export function dotsToMm(dots: Dots, dpi: Dpi): Millimeters {
  return (dots / dpi) * 25.4;
}
