import { describe, expect, it } from 'vitest';
import type { RgbaImage } from '@thermalbridge/thermal-core';
import { encodeJobForRoute } from './encode-job.js';

function whiteImage(width: number, height: number): RgbaImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }
  return { width, height, data };
}

function tsplOptions(image: RgbaImage) {
  return {
    image,
    widthMm: 10,
    heightMm: 10,
    dpi: 203,
    density: 14,
    speed: 4,
    copies: 1,
    media: { mode: 'gap' as const, gapHeightMm: 2, gapOffsetMm: 0 },
    dither: 'threshold' as const,
    threshold: 128,
  };
}

describe('encodeJobForRoute', () => {
  it('clamps X4 density and speed to the profile before encoding TSPL', async () => {
    const image = whiteImage(8, 8);
    const bytes = await encodeJobForRoute({
      profileId: 'marklife-x4',
      transport: 'usb',
      image,
      tspl: { ...tsplOptions(image), density: 99, speed: 9 },
    });
    const text = Buffer.from(bytes).toString('latin1');
    expect(text).toContain('DENSITY 15');
    expect(text).toContain('SPEED 8');
    expect(text).not.toContain('DENSITY 99');
  });

  it('encodes X4 OS-queue jobs as TSPL', async () => {
    const image = whiteImage(8, 8);
    const bytes = await encodeJobForRoute({
      profileId: 'marklife-x4',
      transport: 'cups',
      image,
      tspl: tsplOptions(image),
    });
    const text = Buffer.from(bytes).toString('latin1');
    expect(text).toContain('SIZE');
    expect(text).toContain('DENSITY 14');
  });

  it('does not silently encode TSPL for the canonical X4 SPP protocol-7 route', async () => {
    const image = whiteImage(8, 8);
    await expect(
      encodeJobForRoute({
        profileId: 'marklife-x4',
        transport: 'bluetooth-spp',
        image,
        tspl: tsplOptions(image),
      }),
    ).rejects.toMatchObject({
      name: 'ThermalBridgeError',
      code: 'PROTOCOL_UNIMPLEMENTED',
    });
  });

  it('encodes TSPL only when the X4 SPP diagnostic route is selected explicitly', async () => {
    const image = whiteImage(8, 8);
    const bytes = await encodeJobForRoute({
      profileId: 'marklife-x4',
      transport: 'bluetooth-spp',
      diagnosticRoute: 'x4-spp-raw-tspl',
      image,
      tspl: tsplOptions(image),
    });
    const text = Buffer.from(bytes).toString('latin1');
    expect(text).toContain('SIZE');
    expect(text).toContain('BITMAP');
  });

  it('encodes experimental TSPL for X4 BLE, not protocol 7', async () => {
    const image = whiteImage(8, 8);
    const bytes = await encodeJobForRoute({
      profileId: 'marklife-x4',
      transport: 'bluetooth-ble',
      image,
      tspl: tsplOptions(image),
    });
    const text = Buffer.from(bytes).toString('latin1');
    expect(text).toContain('SIZE');
    expect(text).toContain('BITMAP');
    expect(text).toContain('DENSITY 14');
  });

  it('encodes Phomemo M110 BLE jobs as ESC/POS raster, not TSPL', async () => {
    const image = whiteImage(8, 8);
    const bytes = await encodeJobForRoute({
      profileId: 'phomemo-m110',
      transport: 'bluetooth-ble',
      image,
      tspl: tsplOptions(image),
    });
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x1b, 0x4e, 0x0d, 0x04]);
    expect(Buffer.from(bytes).toString('latin1')).not.toContain('SIZE');
  });

  it('encodes Canon CUPS jobs as a PNG document, not TSPL', async () => {
    const image = whiteImage(8, 8);
    const bytes = await encodeJobForRoute({
      profileId: 'canon-inkjet',
      transport: 'cups',
      image,
      tspl: tsplOptions(image),
    });
    expect(Array.from(bytes.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(Buffer.from(bytes).toString('latin1')).not.toContain('SIZE');
  });

  it('does not encode TSPL for planned D210 or P50 routes', async () => {
    const image = whiteImage(8, 8);
    await expect(
      encodeJobForRoute({
        profileId: 'marklife-d210',
        transport: 'cups',
        image,
        tspl: tsplOptions(image),
      }),
    ).rejects.toMatchObject({
      name: 'ThermalBridgeError',
      code: 'PROTOCOL_UNIMPLEMENTED',
    });
    await expect(
      encodeJobForRoute({
        profileId: 'marklife-p50',
        transport: 'bluetooth-spp',
        image,
        tspl: tsplOptions(image),
      }),
    ).rejects.toMatchObject({
      name: 'ThermalBridgeError',
      code: 'PROTOCOL_UNIMPLEMENTED',
    });
  });
});
