export interface RotatedGray {
  data: Uint8Array;
  width: number;
  height: number;
}

export function rotate90(
  gray: Uint8Array,
  width: number,
  height: number,
): RotatedGray {
  const destWidth = height;
  const destHeight = width;
  const data = new Uint8Array(destWidth * destHeight);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = gray[y * width + x] ?? 0;
      const dx = destWidth - 1 - y;
      const dy = x;
      data[dy * destWidth + dx] = value;
    }
  }

  return { data, width: destWidth, height: destHeight };
}

export function rotate180(
  gray: Uint8Array,
  width: number,
  height: number,
): RotatedGray {
  const once = rotate90(gray, width, height);
  return rotate90(once.data, once.width, once.height);
}

export function rotate270(
  gray: Uint8Array,
  width: number,
  height: number,
): RotatedGray {
  const once = rotate180(gray, width, height);
  return rotate90(once.data, once.width, once.height);
}

export function rotateBy(
  gray: Uint8Array,
  width: number,
  height: number,
  rotation: 0 | 90 | 180 | 270,
): RotatedGray {
  switch (rotation) {
    case 0:
      return { data: gray, width, height };
    case 90:
      return rotate90(gray, width, height);
    case 180:
      return rotate180(gray, width, height);
    case 270:
      return rotate270(gray, width, height);
  }
}
