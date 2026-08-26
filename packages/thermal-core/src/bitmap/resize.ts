export function resizeNearest(
  gray: Uint8Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Uint8Array {
  if (dstW <= 0 || dstH <= 0) {
    throw new Error(`Invalid destination size ${dstW}x${dstH}`);
  }
  if (srcW <= 0 || srcH <= 0) {
    throw new Error(`Invalid source size ${srcW}x${srcH}`);
  }

  const out = new Uint8Array(dstW * dstH);
  for (let y = 0; y < dstH; y++) {
    const srcY = Math.min(srcH - 1, Math.floor((y * srcH) / dstH));
    for (let x = 0; x < dstW; x++) {
      const srcX = Math.min(srcW - 1, Math.floor((x * srcW) / dstW));
      out[y * dstW + x] = gray[srcY * srcW + srcX] ?? 255;
    }
  }
  return out;
}
