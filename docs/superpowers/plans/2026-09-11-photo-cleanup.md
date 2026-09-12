# Photo Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect undersized imported photos, apply local document cleanup, warn the user, and allow revert.

**Architecture:** Detection and pixel cleanup live in `@thermalbridge/thermal-core`. The desktop renderer calls them from `materializePageSource`, keeps the original canvas for revert, and shows a banner plus toast. No new dependencies. PDFs and overlay images are unchanged.

**Tech Stack:** TypeScript (strict), Vitest, React, existing `Alert` / `Button` / sonner, `mmToDots` / `rgbaToGrayscale`.

**Spec:** `docs/superpowers/specs/2026-09-11-photo-cleanup-design.md`

Do not commit unless the user asks.

---

## File map

| File | Role |
| --- | --- |
| `packages/thermal-core/src/bitmap/print-resolution.ts` | `isBelowPrintResolution` |
| `packages/thermal-core/src/bitmap/enhance-document.ts` | `enhanceDocumentRgba` + stretch / unsharp / thicken |
| `packages/thermal-core/src/index.ts` | Export the two public functions |
| `packages/thermal-core/test/bitmap/print-resolution.test.ts` | Detection tests |
| `packages/thermal-core/test/bitmap/enhance-document.test.ts` | Pipeline tests |
| `apps/desktop/src/renderer/src/features/editor/page-sources.ts` | `enhanced`, `originalCanvas`, `revertEnhancedSource` |
| `apps/desktop/src/renderer/src/features/editor/page-sources.test.ts` | Revert helper tests |
| `apps/desktop/src/renderer/src/i18n/messages.ts` | EN/RO copy |
| `apps/desktop/src/renderer/src/features/preview/PhotoCleanupBanner.tsx` | Banner UI |
| `apps/desktop/src/renderer/src/features/preview/PreviewPane.tsx` | Mount banner |
| `apps/desktop/src/renderer/src/App.tsx` | Wire enhance + revert + dismiss |

---

### Task 1: Detection

**Files:**
- Create: `packages/thermal-core/src/bitmap/print-resolution.ts`
- Create: `packages/thermal-core/test/bitmap/print-resolution.test.ts`
- Modify: `packages/thermal-core/src/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { isBelowPrintResolution } from '../../src/bitmap/print-resolution.js';

describe('isBelowPrintResolution', () => {
  it('flags a 599×376 photo on a 100×150 mm 203 DPI label', () => {
    expect(
      isBelowPrintResolution({
        sourceWidth: 599,
        sourceHeight: 376,
        widthMm: 100,
        heightMm: 150,
        dpi: 203,
      }),
    ).toBe(true);
  });

  it('accepts an 800×1200 photo on the same label', () => {
    expect(
      isBelowPrintResolution({
        sourceWidth: 800,
        sourceHeight: 1200,
        widthMm: 100,
        heightMm: 150,
        dpi: 203,
      }),
    ).toBe(false);
  });

  it('uses 90% slack so a near-target photo is not low-res', () => {
    expect(
      isBelowPrintResolution({
        sourceWidth: 720,
        sourceHeight: 1080,
        widthMm: 100,
        heightMm: 150,
        dpi: 203,
      }),
    ).toBe(false);
  });

  it('returns false when needed dots are zero', () => {
    expect(
      isBelowPrintResolution({
        sourceWidth: 10,
        sourceHeight: 10,
        widthMm: 0,
        heightMm: 150,
        dpi: 203,
      }),
    ).toBe(false);
  });
});
```

Need dots via existing `mmToDots` (`Math.round`): 100 mm @ 203 → 799, 150 mm @ 203 → 1199. 90% → 719.1 × 1079.1. So 720×1080 is not low-res; 719×1080 is low-res on width.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @thermalbridge/thermal-core test -- test/bitmap/print-resolution.test.ts`  
Expected: FAIL cannot find module

- [ ] **Step 3: Implement**

```ts
import { mmToDots } from '../geometry/units.js';

export function isBelowPrintResolution(options: {
  sourceWidth: number;
  sourceHeight: number;
  widthMm: number;
  heightMm: number;
  dpi: number;
}): boolean {
  const needW = mmToDots(options.widthMm, options.dpi);
  const needH = mmToDots(options.heightMm, options.dpi);
  if (needW <= 0 || needH <= 0) {
    return false;
  }
  return options.sourceWidth < needW * 0.9 || options.sourceHeight < needH * 0.9;
}
```

Export from `packages/thermal-core/src/index.ts`.

- [ ] **Step 4: Run tests — expected PASS**

---

### Task 2: Cleanup pipeline

**Files:**
- Create: `packages/thermal-core/src/bitmap/enhance-document.ts`
- Create: `packages/thermal-core/test/bitmap/enhance-document.test.ts`
- Modify: `packages/thermal-core/src/index.ts`

- [ ] **Step 1: Write the failing tests**

A 1×1 light-gray-on-off-white pair is awkward; use a 2-pixel image: `[200, 240]` → stretch should make the darker pixel closer to 0 and the lighter closer to 255.

A 3×1 stroke `[255, 40, 255]`: after thicken (min of 3×3, here 1×3), both neighbors become 40.

A flat `[128, 130]` (range 2 < 8): stretch leaves values unchanged.

- [ ] **Step 2: Run — expected FAIL**

- [ ] **Step 3: Implement `enhanceDocumentRgba(rgba, width, height)`**

Order: `rgbaToGrayscale` → contrast stretch (skip if max−min < 8) → unsharp (3×3 box blur, amount 0.6) → one-pixel min dilate → opaque RGB.

- [ ] **Step 4: Run tests — expected PASS**

---

### Task 3: Revert helper

**Files:**
- Modify: `apps/desktop/src/renderer/src/features/editor/page-sources.ts`
- Modify: `apps/desktop/src/renderer/src/features/editor/page-sources.test.ts`

- [ ] Add optional `originalCanvas?: HTMLCanvasElement` and `enhanced?: boolean` (omit when false/absent; honor `exactOptionalPropertyTypes`).

- [ ] `revertEnhancedSource(assets, previewUrl)` returns null without `originalCanvas`; otherwise returns assets with original canvas size, `enhanced` omitted, `originalCanvas` omitted.

- [ ] Test both branches. Existing `assets()` helper stays valid (omitted optionals).

---

### Task 4: i18n

**Files:**
- Modify: `apps/desktop/src/renderer/src/i18n/messages.ts`

Add matching EN/RO keys from the spec plus `photoCleanupDismiss` (`Dismiss` / `Închide`) for the × button.

Run: `pnpm --filter @thermalbridge/desktop test -- src/renderer/src/i18n/i18n.test.ts`  
Expected: PASS (same keys both locales)

---

### Task 5: Wire import + banner

**Files:**
- Create: `apps/desktop/src/renderer/src/features/preview/PhotoCleanupBanner.tsx`
- Modify: `apps/desktop/src/renderer/src/features/preview/PreviewPane.tsx`
- Modify: `apps/desktop/src/renderer/src/App.tsx`

- [ ] In `materializePageSource`, after rotate: if mime is not PDF and `isBelowPrintResolution`, clone canvas, run `enhanceDocumentRgba`, `putImageData` only on success, set `enhanced` + `originalCanvas`. Success → `toast.warning(t('photoLowResCleanup'))`. Throw → `toast.error(t('photoCleanupFailed'))`, keep original, no `enhanced`.

- [ ] Banner under `EditorTopChrome` when `showCleanupBanner`. Revert / dismiss callbacks.

- [ ] App: `cleanupBannerDismissed` set of page ids. Show when selected assets `enhanced` and page not dismissed. New import for that page clears dismiss. Revert: new preview URL from `originalCanvas`, `revertEnhancedSource`, `boxFromFit`, revoke old URL.

- [ ] Do not enhance overlay `onAddImage`. Do not re-enhance on label size change.

---

### Task 6: Verify

Run:

```
pnpm --filter @thermalbridge/thermal-core test
pnpm --filter @thermalbridge/thermal-core typecheck
pnpm --filter @thermalbridge/desktop test
pnpm --filter @thermalbridge/desktop typecheck
```

Expected: all pass.

---

## Spec coverage

| Spec item | Task |
| --- | --- |
| Detection + 90% slack + zero need | 1 |
| Skip PDF (caller never invokes) | 5 |
| Stretch / unsharp / thicken / opaque RGB | 2 |
| Cleanup throw → original + toast | 5 |
| `originalCanvas` / `enhanced` / revert | 3, 5 |
| Banner, toast, dismiss, i18n | 4, 5 |
| Print uses current canvas; X4 invert unchanged | 5 (no print-path change) |
| No ML, no OCR, no overlay enhance | non-goals |
