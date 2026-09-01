export const D210_FEED_MM_MIN = 0;
export const D210_FEED_MM_MAX = 32;

export type D210MediaType =
  | 'continuous'
  | 'label'
  | 'folded-with-marks'
  | 'tattoo'
  | 'label-with-marks';

export type D210Processing = 'none' | 'diffusion' | 'gathering' | 'error-diffusion';

export const D210_MEDIA_TYPES: readonly D210MediaType[] = [
  'continuous',
  'label',
  'folded-with-marks',
  'tattoo',
  'label-with-marks',
] as const;

export const D210_PROCESSING_MODES: readonly D210Processing[] = [
  'none',
  'diffusion',
  'gathering',
  'error-diffusion',
] as const;

export interface D210PrintSettings {
  mediaType: D210MediaType;
  locateBeforeEveryPage: boolean;
  processing: D210Processing;
  documentBeginMm: number;
  pageBeginMm: number;
  pageEndMm: number;
  documentEndMm: number;
  savePaperUp: boolean;
  savePaperDown: boolean;
}

export const DEFAULT_D210_PRINT_SETTINGS: D210PrintSettings = {
  mediaType: 'label',
  locateBeforeEveryPage: true,
  processing: 'none',
  documentBeginMm: 0,
  pageBeginMm: 0,
  pageEndMm: 0,
  documentEndMm: 12,
  savePaperUp: false,
  savePaperDown: false,
};

export function isD210LabelMedia(mediaType: D210MediaType): boolean {
  return (
    mediaType === 'label' || mediaType === 'label-with-marks' || mediaType === 'folded-with-marks'
  );
}

export function isD210ContinuousMedia(mediaType: D210MediaType): boolean {
  return mediaType === 'continuous';
}

export function clampD210FeedMm(value: number): number {
  if (!Number.isFinite(value)) {
    return D210_FEED_MM_MIN;
  }
  return Math.min(D210_FEED_MM_MAX, Math.max(D210_FEED_MM_MIN, Math.round(value * 10) / 10));
}

export function applyD210PrintSettings(current: D210PrintSettings): D210PrintSettings {
  const mediaType = D210_MEDIA_TYPES.includes(current.mediaType)
    ? current.mediaType
    : DEFAULT_D210_PRINT_SETTINGS.mediaType;
  const processing = D210_PROCESSING_MODES.includes(current.processing)
    ? current.processing
    : DEFAULT_D210_PRINT_SETTINGS.processing;
  return {
    mediaType,
    locateBeforeEveryPage: isD210LabelMedia(mediaType)
      ? current.locateBeforeEveryPage
      : DEFAULT_D210_PRINT_SETTINGS.locateBeforeEveryPage,
    processing,
    documentBeginMm: clampD210FeedMm(current.documentBeginMm),
    pageBeginMm: clampD210FeedMm(current.pageBeginMm),
    pageEndMm: clampD210FeedMm(current.pageEndMm),
    documentEndMm: clampD210FeedMm(current.documentEndMm),
    savePaperUp: current.savePaperUp,
    savePaperDown: current.savePaperDown,
  };
}
