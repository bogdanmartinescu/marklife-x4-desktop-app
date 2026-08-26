export function mirrorX(gray: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      out[row + (width - 1 - x)] = gray[row + x] ?? 0;
    }
  }
  return out;
}

export function mirrorY(gray: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y;
    for (let x = 0; x < width; x++) {
      out[y * width + x] = gray[srcY * width + x] ?? 0;
    }
  }
  return out;
}
