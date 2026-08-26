import type { AppSettings } from '@thermalbridge/shared';
import type { PrintDraft } from './types.js';

export function applySettingsToDraft(
  current: PrintDraft,
  settings: AppSettings,
  options: { preserveLabelSize: boolean },
): PrintDraft {
  return {
    ...current,
    printerId: settings.lastPrinterId ?? current.printerId,
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
  };
}
