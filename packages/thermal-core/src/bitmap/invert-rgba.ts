export function invertRgba(rgba: Uint8Array): Uint8Array {
  const out = new Uint8Array(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    out[i] = 255 - (rgba[i] ?? 0);
    out[i + 1] = 255 - (rgba[i + 1] ?? 0);
    out[i + 2] = 255 - (rgba[i + 2] ?? 0);
    out[i + 3] = rgba[i + 3] ?? 255;
  }
  return out;
}
