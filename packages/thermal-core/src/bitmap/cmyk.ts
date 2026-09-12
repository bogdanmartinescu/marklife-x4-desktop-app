export interface Cmyk {
  c: number;
  m: number;
  y: number;
  k: number;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** RGB max–min at or below this is treated as paper/text gray → K only. */
const NEUTRAL_CHROMA = 12;
/** Darkest channel at or below this is K-only so text is not rich black. */
const NEAR_BLACK = 32;
/** Typical consumer-inkjet total area coverage cap (280%). */
const TAC_LIMIT = 2.8;

export function rgbToCmyk(r: number, g: number, b: number): Cmyk {
  const rn = clamp01(r / 255);
  const gn = clamp01(g / 255);
  const bn = clamp01(b / 255);
  const k = 1 - Math.max(rn, gn, bn);
  if (k >= 1 - Number.EPSILON) {
    return { c: 0, m: 0, y: 0, k: 1 };
  }
  const inv = 1 - k;
  return {
    c: (1 - rn - k) / inv,
    m: (1 - gn - k) / inv,
    y: (1 - bn - k) / inv,
    k,
  };
}

export function cmykToRgb(cmyk: Cmyk): Rgb {
  return {
    r: clampByte(255 * (1 - cmyk.c) * (1 - cmyk.k)),
    g: clampByte(255 * (1 - cmyk.m) * (1 - cmyk.k)),
    b: clampByte(255 * (1 - cmyk.y) * (1 - cmyk.k)),
  };
}

export function applyInkjetCmyk(cmyk: Cmyk, rgb: Rgb): Cmyk {
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  if (max <= NEAR_BLACK) {
    return { c: 0, m: 0, y: 0, k: 1 - max / 255 };
  }
  if (max - min <= NEUTRAL_CHROMA) {
    const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    return { c: 0, m: 0, y: 0, k: 1 - luminance };
  }
  return limitTotalAreaCoverage(cmyk);
}

export function prepareInkjetRgba(rgba: Uint8Array): Uint8Array {
  const out = new Uint8Array(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i] ?? 0;
    const g = rgba[i + 1] ?? 0;
    const b = rgba[i + 2] ?? 0;
    const next = cmykToRgb(applyInkjetCmyk(rgbToCmyk(r, g, b), { r, g, b }));
    out[i] = next.r;
    out[i + 1] = next.g;
    out[i + 2] = next.b;
    out[i + 3] = rgba[i + 3] ?? 255;
  }
  return out;
}

function limitTotalAreaCoverage(cmyk: Cmyk): Cmyk {
  const tac = cmyk.c + cmyk.m + cmyk.y + cmyk.k;
  if (tac <= TAC_LIMIT) {
    return cmyk;
  }
  const cmy = cmyk.c + cmyk.m + cmyk.y;
  if (cmy <= 0) {
    return { c: 0, m: 0, y: 0, k: Math.min(1, TAC_LIMIT) };
  }
  const scale = Math.max(0, (TAC_LIMIT - cmyk.k) / cmy);
  return {
    c: cmyk.c * scale,
    m: cmyk.m * scale,
    y: cmyk.y * scale,
    k: cmyk.k,
  };
}

function clamp01(value: number): number {
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function clampByte(value: number): number {
  if (value <= 0) {
    return 0;
  }
  if (value >= 255) {
    return 255;
  }
  return Math.round(value);
}
