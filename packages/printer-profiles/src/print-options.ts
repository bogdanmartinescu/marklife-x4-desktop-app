import {
  DEFAULT_LABEL_SIZES,
  labelSizeRecord,
  printableWidthMm,
  type LabelSize,
  type PrinterProfile,
} from './schema.js';

export type MediaMode = PrinterProfile['mediaModes'][number];

export interface ProfilePrintSettings {
  density: number;
  speed: number;
  mediaMode: MediaMode;
  offsetXmm: number;
  offsetYmm: number;
  mirrorX: boolean;
  mirrorY: boolean;
  negative: boolean;
  widthMm: number;
  heightMm: number;
}

/** TSPL jobs send GAP/BLINE millimetres. ESC/POS (M110) only sends a media-type byte. */
export function profileUsesMediaDimensions(profile: PrinterProfile): boolean {
  return profile.language === 'tspl';
}

export function labelSizesForMaxWidth(maxWidthMm: number | undefined): readonly LabelSize[] {
  if (maxWidthMm === undefined) {
    return DEFAULT_LABEL_SIZES;
  }
  return DEFAULT_LABEL_SIZES.filter((size) => size.widthMm <= maxWidthMm);
}

export function labelSizesForProfile(profile: PrinterProfile): readonly LabelSize[] {
  if (profile.labelSizes !== undefined && profile.labelSizes.length > 0) {
    return profile.labelSizes.map((size) => {
      const named = labelSizeRecord(size.widthMm, size.heightMm);
      return {
        widthMm: size.widthMm,
        heightMm: size.heightMm,
        displayName: size.displayName ?? named.displayName,
        ...(size.group !== undefined ? { group: size.group } : {}),
      };
    });
  }
  return labelSizesForMaxWidth(profile.maxWidthMm);
}

export function applyProfilePrintSettings(
  profile: PrinterProfile,
  current: ProfilePrintSettings,
): ProfilePrintSettings {
  const mediaMode = profile.mediaModes.includes(current.mediaMode)
    ? current.mediaMode
    : (profile.mediaModes[0] ?? 'gap');
  const paper = resolveLabelSize(profile, current.widthMm, current.heightMm);
  return {
    density: clampInt(current.density, profile.density.min, profile.density.max),
    speed: nearestNumber(profile.speed.values, current.speed, profile.speed.default),
    mediaMode,
    offsetXmm: clamp(current.offsetXmm, profile.offsets.minXmm, profile.offsets.maxXmm),
    offsetYmm: clamp(current.offsetYmm, profile.offsets.minYmm, profile.offsets.maxYmm),
    mirrorX: profile.transforms.mirror ? current.mirrorX : false,
    mirrorY: profile.transforms.mirror ? current.mirrorY : false,
    negative: profile.transforms.negative ? current.negative : false,
    widthMm: paper.widthMm,
    heightMm: paper.heightMm,
  };
}

function resolveLabelSize(
  profile: PrinterProfile,
  widthMm: number,
  heightMm: number,
): { widthMm: number; heightMm: number } {
  const sizes = labelSizesForProfile(profile);
  const known = sizes.some((size) => size.widthMm === widthMm && size.heightMm === heightMm);
  if (known) {
    return { widthMm, heightMm };
  }
  if (profile.maxWidthMm !== undefined && widthMm > profile.maxWidthMm) {
    const fallback =
      sizes.find((size) => size.widthMm === 40 && size.heightMm === 30) ?? sizes[0];
    if (fallback !== undefined) {
      return { widthMm: fallback.widthMm, heightMm: fallback.heightMm };
    }
    return { widthMm: printableWidthMm(widthMm, profile.maxWidthMm), heightMm };
  }
  return { widthMm, heightMm };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function clampInt(value: number, min: number, max: number): number {
  return clamp(Math.round(value), min, max);
}

function nearestNumber(values: readonly number[], value: number, fallback: number): number {
  const first = values[0];
  if (first === undefined) {
    return fallback;
  }
  let best = first;
  let bestDist = Math.abs(value - first);
  for (const candidate of values) {
    const dist = Math.abs(value - candidate);
    if (dist < bestDist) {
      best = candidate;
      bestDist = dist;
    }
  }
  return best;
}
