import { mmToDots, type RgbaImage } from '@thermalbridge/thermal-core';

export function buildTestPattern(widthMm: number, heightMm: number, dpi: number): RgbaImage {
  const width = mmToDots(widthMm, dpi);
  const height = mmToDots(heightMm, dpi);
  const data = new Uint8ClampedArray(width * height * 4).fill(255);

  const setBlack = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }
    const offset = (y * width + x) * 4;
    data[offset] = 0;
    data[offset + 1] = 0;
    data[offset + 2] = 0;
    data[offset + 3] = 255;
  };

  for (let x = 0; x < width; x++) {
    setBlack(x, 0);
    setBlack(x, 1);
    setBlack(x, height - 1);
    setBlack(x, height - 2);
  }
  for (let y = 0; y < height; y++) {
    setBlack(0, y);
    setBlack(1, y);
    setBlack(width - 1, y);
    setBlack(width - 2, y);
    setBlack(Math.floor(width / 2), y);
  }
  for (let x = 0; x < width; x++) {
    setBlack(x, Math.floor(height / 2));
  }

  const barHeight = Math.max(8, Math.floor(height / 16));
  const barY = Math.floor(height * 0.75);
  const bars = 8;
  const barWidth = Math.floor(width / bars);
  for (let bar = 0; bar < bars; bar++) {
    const shade = Math.round((bar / Math.max(1, bars - 1)) * 255);
    for (let y = 0; y < barHeight; y++) {
      for (let x = 0; x < barWidth; x++) {
        const px = bar * barWidth + x;
        const py = barY + y;
        if (px >= width || py >= height) {
          continue;
        }
        const offset = (py * width + px) * 4;
        data[offset] = shade;
        data[offset + 1] = shade;
        data[offset + 2] = shade;
        data[offset + 3] = 255;
      }
    }
  }

  return { width, height, data };
}
