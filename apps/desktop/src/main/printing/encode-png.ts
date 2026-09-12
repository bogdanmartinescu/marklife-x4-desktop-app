import { crc32, deflateSync } from 'node:zlib';

const PNG_SIGNATURE = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);

export function encodeRgbaPng(options: {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
  dpi: number;
}): Uint8Array {
  const { width, height, data, dpi } = options;
  if (data.length !== width * height * 4) {
    throw new Error('RGBA buffer length does not match PNG dimensions');
  }
  const raw = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const dest = y * (width * 4 + 1);
    raw[dest] = 0;
    raw.set(data.subarray(y * width * 4, (y + 1) * width * 4), dest + 1);
  }
  const pixelsPerMetre = Math.round(dpi / 0.0254);
  const chunks = [
    chunk('IHDR', ihdr(width, height)),
    chunk('pHYs', phys(pixelsPerMetre)),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array(0)),
  ];
  const out = new Uint8Array(PNG_SIGNATURE.length + chunks.reduce((sum, item) => sum + item.length, 0));
  out.set(PNG_SIGNATURE, 0);
  let offset = PNG_SIGNATURE.length;
  for (const item of chunks) {
    out.set(item, offset);
    offset += item.length;
  }
  return out;
}

function ihdr(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(13);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  bytes[8] = 8;
  bytes[9] = 6;
  return bytes;
}

function phys(pixelsPerMetre: number): Uint8Array {
  const bytes = new Uint8Array(9);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, pixelsPerMetre);
  view.setUint32(4, pixelsPerMetre);
  bytes[8] = 1;
  return bytes;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(12 + data.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, data.length);
  bytes.set(Buffer.from(type, 'ascii'), 4);
  bytes.set(data, 8);
  const crcInput = bytes.subarray(4, 8 + data.length);
  view.setUint32(8 + data.length, crc32(crcInput) >>> 0);
  return bytes;
}
