import { describe, expect, it } from 'vitest';
import { deleteSelectedFromPage, sourceDocumentStillUsed } from './delete-selection.js';
import { createBlankLabelPage } from './label-pages.js';
import { createImageOverlay, createTextOverlay } from './overlay.js';

const SOURCE_ID = 'awb-image';

describe('deleteSelectedFromPage', () => {
  it('removes a placed image overlay', () => {
    const image = createImageOverlay(40, 30, 'data:image/png;base64,aa', 80, 40);
    const text = createTextOverlay(40, 30);
    const page = { ...createBlankLabelPage(), overlays: [image, text] };
    const next = deleteSelectedFromPage(page, image.id, SOURCE_ID);
    expect(next?.overlays.map((item) => item.id)).toEqual([text.id]);
    expect(next?.hasSource).toBe(false);
  });

  it('removes the imported source image without touching overlays', () => {
    const image = createImageOverlay(40, 30, 'data:image/png;base64,aa', 80, 40);
    const page = {
      ...createBlankLabelPage(),
      overlays: [image],
      hasSource: true,
      contentBox: { xMm: 0, yMm: 0, widthMm: 40, heightMm: 30 },
    };
    const next = deleteSelectedFromPage(page, SOURCE_ID, SOURCE_ID);
    expect(next?.hasSource).toBe(false);
    expect(next?.contentBox).toBeNull();
    expect(next?.overlays).toEqual([image]);
  });

  it('does nothing when there is no selection', () => {
    const page = { ...createBlankLabelPage(), hasSource: true };
    expect(deleteSelectedFromPage(page, null, SOURCE_ID)).toBeNull();
  });
});

describe('sourceDocumentStillUsed', () => {
  it('is false after the last page drops the imported image', () => {
    const kept = { ...createBlankLabelPage(), hasSource: true };
    const cleared = { ...createBlankLabelPage(), hasSource: false };
    expect(sourceDocumentStillUsed([kept, cleared])).toBe(true);
    expect(sourceDocumentStillUsed([cleared])).toBe(false);
  });
});
