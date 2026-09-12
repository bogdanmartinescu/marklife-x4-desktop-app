# Low-resolution photo warning and cleanup

Date: 2026-09-11  
Status: approved for implementation planning

## Problem

Users import phone photos or screenshots of dense forms (for example a Cargus AWB). A typical file is ~599×376. A 100×150 mm label at 203 DPI needs about 800×1200 dots. After 1-bit threshold the type is unreadable. Wrapping the photo in a PDF does not add resolution. OCR rebuild is out of scope.

## Goal

On image import:

1. Detect when the photo is below the current label’s printer-dot size.
2. Apply a local document cleanup automatically.
3. Warn that fine text may still be unreadable.
4. Let the user revert to the original photo.

Success is a clearer bitmap and an honest warning, not a readable reconstruction of 6 pt type.

## Non-goals

- ML / super-resolution models
- New npm or native dependencies
- OCR or “rebuild as text PDF”
- Deskew
- Changing default threshold or dither
- Enhancing overlay images dropped on the canvas
- Enhancing PDFs (already rasterized at printer DPI)
- Re-running cleanup when the user later changes label size
- Settings toggle in this slice

## Detection

After `renderSourceBitmap` + `rotateSource`, compare intrinsic pixel size to the current label at the active profile DPI:

```
needW = floor(widthMm / 25.4 × dpi)
needH = floor(heightMm / 25.4 × dpi)
lowRes = sourceW < needW × 0.9 || sourceH < needH × 0.9
```

90% slack avoids enhancing a photo that is already essentially at target.

Skip when:

- `mimeType === 'application/pdf'`
- either `needW` or `needH` is 0
- `lowRes` is false

Example: AWB 100×150 mm at 203 DPI → need ≈ 799×1199. A 599×376 JPEG is low-res.

## Cleanup pipeline

Pure functions in `@thermalbridge/thermal-core` (no Electron/DOM). Renderer decodes to RGBA, calls cleanup, writes the result onto a canvas.

Order:

1. Upscale the photo to the fitted label size at printer DPI (bilinear, high quality). Native-size thicken destroyed 4–6 px glyphs on AWB photos (X4_05A1 2026-09-11).
2. `rgbaToGrayscale` (existing; transparent composites onto white).
3. Contrast stretch only when the gray range is 8–200 (faded scan). Full black–white photos are left unstretched.
4. Light unsharp: 3×3 box blur, `amount = 0.25`. No morphological thicken.
5. Expand gray back to opaque RGB (`R=G=B`, `A=255`).

If any step throws, import keeps the decoded original. No `enhanced` flag. Toast only: cleanup failed; using the original photo.

## State

Extend `PageSourceAssets`:

| Field | Meaning |
| --- | --- |
| `document` | Original file bytes. Library `addMedia` still stores this. |
| `canvas`, `previewUrl`, `width`, `height` | What the editor and print compose use. |
| `originalCanvas` | Decoded original, present only after a successful enhance. |
| `enhanced` | `true` after successful enhance, until revert or new import. |

Print and history PNG use the current canvas (enhanced until revert). X4 `printRgbaForProfile` invert stays a print-only copy of that RGBA.

Revert:

1. Replace `canvas` / `previewUrl` / `width` / `height` from `originalCanvas`.
2. Set `enhanced` to false.
3. Recalculate `contentBox` from the original intrinsic size and current fit mode.
4. Hide the banner.

Replacing the page source drops the old pair and runs detection again.

Changing label size or fit mode does not re-enhance. The banner remains if `enhanced` is still true.

## UI

- Toast on successful enhance: same sentence as the banner.
- Banner under the editor top bar, above the canvas, when the selected page has `enhanced === true`.
- Actions: Revert, dismiss (×). Dismiss hides the banner for that page until the next import. Revert restores pixels and removes the banner.
- No settings control in this slice.

Copy:

| Key | EN | RO |
| --- | --- | --- |
| `photoLowResCleanup` | This photo is below print resolution. Cleanup was applied; fine text may still be unreadable. | Fotografia este sub rezoluția de print. S-a aplicat o curățare; textul mic poate rămâne ilizibil. |
| `photoCleanupFailed` | Cleanup failed; using the original photo. | Curățarea a eșuat; se folosește fotografia originală. |
| `photoCleanupRevert` | Revert | Revino |

## Architecture

```
loadBytes (image)
  → renderSourceBitmap + rotateSource
  → isBelowPrintResolution(size, labelMm, dpi)
  → enhanceDocumentRgba(rgba)     // thermal-core, images only
  → putPageSource({ enhanced, originalCanvas })
  → toast + banner
```

`thermal-core` owns: `isBelowPrintResolution`, `enhanceDocumentRgba` (grayscale stretch → unsharp → thicken → opaque RGB), and their unit tests.

Desktop renderer owns: when to call them in `materializePageSource`, banner/toast/i18n, revert.

Do not send binary through strings. Jobs stay `Uint8Array`.

## Testing

- `isBelowPrintResolution`: 599×376 vs 100×150@203 is low-res; 800×1200 is not; 90% slack; PDF callers never invoke it.
- Contrast stretch: light-gray letter on off-white becomes darker; full-range photos are unchanged.
- A one-pixel dark stroke does not smear onto its neighbors.
- Near-flat gray (range < 8) is unchanged by stretch.
- Revert restores original canvas dimensions and clears `enhanced`.
- `materializePageSource` / page-source helper: enhance path sets `enhanced`; PDF path does not.

## Error handling

- Decode failure: existing import error path. No cleanup.
- Cleanup throw: original photo, `photoCleanupFailed` toast, no banner.
- Revert with missing `originalCanvas`: no-op.

## Out of scope follow-ups

Experimental OCR → vector PDF rebuild. Overlay-image enhance. User setting to disable auto-cleanup.
