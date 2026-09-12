import {
  applyD210PrintSettings,
  applyProfilePrintSettings,
  DEFAULT_D210_PRINT_SETTINGS,
  getProfile,
  MARKLIFE_X4,
  profileDefaultPrintSettings,
} from '@thermalbridge/printer-profiles';
import type { AppSettings } from '@thermalbridge/shared';
import type { PrintDraft } from './types.js';

export function applySettingsToDraft(
  current: PrintDraft,
  settings: AppSettings,
  options: { preserveLabelSize: boolean },
): PrintDraft {
  const printerId = settings.lastPrinterId ?? current.printerId;
  const binding = settings.bindings.find((item) => item.printerId === printerId);
  const merged: PrintDraft = {
    ...current,
    printerId,
    ...(binding !== undefined ? { profileId: binding.profileId } : {}),
    ...(options.preserveLabelSize
      ? {}
      : {
          widthMm: settings.defaultLabelSize.widthMm,
          heightMm: settings.defaultLabelSize.heightMm,
        }),
    mediaMode: settings.defaultMediaMode,
    gapHeightMm: settings.defaultGapHeightMm,
    gapOffsetMm: settings.defaultGapOffsetMm,
    copies: settings.defaultCopies,
    dither: settings.defaultDither,
    threshold: settings.defaultThreshold,
    d210: applyD210PrintSettings(current.d210 ?? DEFAULT_D210_PRINT_SETTINGS),
  };
  const profile = getProfile(merged.profileId) ?? MARKLIFE_X4;
  const defaults = profileDefaultPrintSettings(profile);
  const paper =
    !options.preserveLabelSize && defaults.widthMm !== undefined && defaults.heightMm !== undefined
      ? { widthMm: defaults.widthMm, heightMm: defaults.heightMm }
      : {};
  return {
    ...merged,
    ...applyProfilePrintSettings(profile, merged),
    ...paper,
    d210: merged.d210,
  };
}
