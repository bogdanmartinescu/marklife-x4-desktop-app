import { describe, expect, it } from 'vitest';
import { contrastStretch, enhanceDocumentRgba } from '../../src/bitmap/enhance-document.js';

function grayRgba(values: number[]): Uint8Array {
  const out = new Uint8Array(values.length * 4);
  for (let i = 0; i < values.length; i++) {
    const value = values[i] ?? 0;
    const offset = i * 4;
    out[offset] = value;
    out[offset + 1] = value;
    out[offset + 2] = value;
    out[offset + 3] = 255;
  }
  return out;
}

function rgbaToGray(rgba: Uint8Array): number[] {
  const out: number[] = [];
  for (let i = 0; i < rgba.length; i += 4) {
    out.push(rgba[i] ?? 0);
  }
  return out;
}

describe('enhanceDocumentRgba', () => {
  it('stretches a light-gray letter on off-white so the letter becomes darker', () => {
    const out = Array.from(contrastStretch(new Uint8Array([200, 240])));
    expect(out[0] ?? 0).toBeLessThan(out[1] ?? 0);
    expect(out[0] ?? 0).toBeLessThan(200);
    expect(out[1] ?? 0).toBeGreaterThan(240);
  });

  it('does not smear a one-pixel dark stroke onto its neighbors', () => {
    const input = grayRgba([255, 40, 255]);
    const out = rgbaToGray(enhanceDocumentRgba(input, 3, 1));
    expect(out[1] ?? 255).toBeLessThan(80);
    expect(out[0] ?? 0).toBeGreaterThan(200);
    expect(out[2] ?? 0).toBeGreaterThan(200);
  });

  it('does not stretch a photo that already spans black to white', () => {
    expect(Array.from(contrastStretch(new Uint8Array([0, 128, 255])))).toEqual([0, 128, 255]);
  });

  it('leaves a near-flat gray range unchanged by contrast stretch', () => {
    expect(Array.from(contrastStretch(new Uint8Array([128, 130])))).toEqual([128, 130]);
  });

  it('writes opaque RGB', () => {
    const input = grayRgba([100]);
    const out = enhanceDocumentRgba(input, 1, 1);
    expect(out[3]).toBe(255);
    expect(out[0]).toBe(out[1]);
    expect(out[1]).toBe(out[2]);
  });
});
