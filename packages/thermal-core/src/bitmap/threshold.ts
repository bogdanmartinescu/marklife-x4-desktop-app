export function applyThreshold(gray: Uint8Array, threshold = 128): Uint8Array {
  const out = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) {
    const value = gray[i] ?? 255;
    out[i] = value < threshold ? 1 : 0;
  }
  return out;
}
