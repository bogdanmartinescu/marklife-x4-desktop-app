export function negateThreshold(pixels: Uint8Array): Uint8Array {
  const out = new Uint8Array(pixels.length);
  for (let i = 0; i < pixels.length; i++) {
    out[i] = (pixels[i] ?? 0) === 0 ? 1 : 0;
  }
  return out;
}
