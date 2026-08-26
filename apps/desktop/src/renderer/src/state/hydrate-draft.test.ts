import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '@thermalbridge/shared';
import type { PrintDraft } from './types.js';
import { applySettingsToDraft } from './hydrate-draft.js';

const DRAFT: PrintDraft = {
  printerId: '',
  profileId: 'marklife-x4',
  widthMm: 50,
  heightMm: 30,
  mediaMode: 'continuous',
  gapHeightMm: 2,
  gapOffsetMm: 0,
  markHeightMm: 3,
  markOffsetMm: 0,
  density: 14,
  speed: 4,
  copies: 1,
  dither: 'threshold',
  threshold: 128,
  rotation: 0,
  fitMode: 'fit',
  mirrorX: false,
  mirrorY: false,
  negative: false,
  offsetXmm: 0,
  offsetYmm: 0,
  diagnosticTsplOverSpp: false,
};

describe('applySettingsToDraft', () => {
  it('applies the saved label size when the user has not chosen one', () => {
    const next = applySettingsToDraft(DRAFT, DEFAULT_APP_SETTINGS, { preserveLabelSize: false });
    expect(next.widthMm).toBe(100);
    expect(next.heightMm).toBe(150);
    expect(next.mediaMode).toBe('gap');
  });

  it('keeps the chosen label size when settings load late', () => {
    const next = applySettingsToDraft(DRAFT, DEFAULT_APP_SETTINGS, { preserveLabelSize: true });
    expect(next.widthMm).toBe(50);
    expect(next.heightMm).toBe(30);
    expect(next.printerId).toBe(DEFAULT_APP_SETTINGS.lastPrinterId ?? '');
  });
});
