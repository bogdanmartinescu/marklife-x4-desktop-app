export type PrintColorModel = 'thermal-mono' | 'inkjet-cmyk';

export type SourceColorPrep = 'none' | 'thermal-enhance' | 'inkjet-cmyk';

export interface SourcePrep {
  upscale: boolean;
  color: SourceColorPrep;
}

export function sourcePrepForPage(options: {
  mimeType: string;
  colorModel: PrintColorModel;
  belowResolution: boolean;
  forceEnhance?: boolean;
}): SourcePrep {
  if (options.colorModel === 'inkjet-cmyk') {
    return {
      upscale: options.belowResolution,
      color: 'inkjet-cmyk',
    };
  }
  if (options.mimeType === 'application/pdf') {
    return { upscale: false, color: 'none' };
  }
  if (options.belowResolution) {
    return { upscale: true, color: 'thermal-enhance' };
  }
  if (options.forceEnhance === true) {
    return { upscale: false, color: 'thermal-enhance' };
  }
  return { upscale: false, color: 'none' };
}
