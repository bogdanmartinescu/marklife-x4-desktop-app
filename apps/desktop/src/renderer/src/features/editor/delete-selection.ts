import type { LabelPage } from './label-pages.js';

export function deleteSelectedFromPage(
  page: LabelPage,
  selectedId: string | null,
  sourceImageId: string,
): LabelPage | null {
  if (!selectedId) {
    return null;
  }
  if (selectedId === sourceImageId) {
    if (!page.hasSource && page.contentBox === null) {
      return null;
    }
    return { ...page, hasSource: false, contentBox: null };
  }
  const overlays = page.overlays.filter((item) => item.id !== selectedId);
  if (overlays.length === page.overlays.length) {
    return null;
  }
  return { ...page, overlays };
}

export function sourceDocumentStillUsed(pages: readonly LabelPage[]): boolean {
  return pages.some((page) => page.hasSource);
}
