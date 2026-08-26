export function floydSteinberg(
  gray: Uint8Array,
  width: number,
  height: number,
  threshold = 128,
): Uint8Array {
  if (gray.length < width * height) {
    throw new Error(`Gray buffer too small: ${gray.length} < ${width * height}`);
  }

  const work = Float64Array.from(gray);
  const out = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const old = work[i] ?? 0;
      const quantized = old < threshold ? 0 : 255;
      const error = old - quantized;
      out[i] = quantized === 0 ? 1 : 0;

      if (x + 1 < width) {
        addError(work, i + 1, error * (7 / 16));
      }
      if (y + 1 < height) {
        if (x > 0) {
          addError(work, i + width - 1, error * (3 / 16));
        }
        addError(work, i + width, error * (5 / 16));
        if (x + 1 < width) {
          addError(work, i + width + 1, error * (1 / 16));
        }
      }
    }
  }

  return out;
}

function addError(work: Float64Array, index: number, amount: number): void {
  work[index] = (work[index] ?? 0) + amount;
}
