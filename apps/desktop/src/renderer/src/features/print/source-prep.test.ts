import { describe, expect, it } from 'vitest';
import { sourcePrepForPage } from './source-prep.js';

describe('sourcePrepForPage', () => {
  it('upscales and prepares CMYK for an inkjet PDF below print resolution', () => {
    expect(
      sourcePrepForPage({
        mimeType: 'application/pdf',
        colorModel: 'inkjet-cmyk',
        belowResolution: true,
      }),
    ).toEqual({ upscale: true, color: 'inkjet-cmyk' });
  });

  it('still prepares CMYK for a full-resolution inkjet page', () => {
    expect(
      sourcePrepForPage({
        mimeType: 'application/pdf',
        colorModel: 'inkjet-cmyk',
        belowResolution: false,
      }),
    ).toEqual({ upscale: false, color: 'inkjet-cmyk' });
  });

  it('does not grayscale-enhance thermal PDFs', () => {
    expect(
      sourcePrepForPage({
        mimeType: 'application/pdf',
        colorModel: 'thermal-mono',
        belowResolution: true,
      }),
    ).toEqual({ upscale: false, color: 'none' });
  });

  it('upscales and enhances a low-res thermal photo', () => {
    expect(
      sourcePrepForPage({
        mimeType: 'image/jpeg',
        colorModel: 'thermal-mono',
        belowResolution: true,
      }),
    ).toEqual({ upscale: true, color: 'thermal-enhance' });
  });

  it('enhances a thermal photo only when forced', () => {
    expect(
      sourcePrepForPage({
        mimeType: 'image/png',
        colorModel: 'thermal-mono',
        belowResolution: false,
        forceEnhance: true,
      }),
    ).toEqual({ upscale: false, color: 'thermal-enhance' });
  });
});
