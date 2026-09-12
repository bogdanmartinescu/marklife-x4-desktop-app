import type { ContentBox } from '../preview/content-placement.js';
import { createOverlayId, type OverlayElement } from './overlay.js';

export const LABEL_PAGE_MAX = 50;

export interface LabelPage {
  id: string;
  overlays: OverlayElement[];
  contentBox: ContentBox | null;
  hasSource: boolean;
}

export function createLabelPageId(): string {
  return `page-${crypto.randomUUID()}`;
}

export function createBlankLabelPage(): LabelPage {
  return {
    id: createLabelPageId(),
    overlays: [],
    contentBox: null,
    hasSource: false,
  };
}

export function resolveSelectedPage(
  pages: readonly LabelPage[],
  selectedPageId: string,
): LabelPage | undefined {
  return pages.find((page) => page.id === selectedPageId) ?? pages[0];
}

/** One stacked canvas per PDF page. Keeps overlays on the first page. */
export function pagesForImportedPdf(pageCount: number, firstPage?: LabelPage): LabelPage[] {
  const count = Math.min(LABEL_PAGE_MAX, Math.max(1, Math.floor(pageCount)));
  const first: LabelPage = firstPage
    ? { ...firstPage, hasSource: true }
    : { ...createBlankLabelPage(), hasSource: true };
  if (count === 1) {
    return [first];
  }
  const rest = Array.from({ length: count - 1 }, () => ({
    ...createBlankLabelPage(),
    hasSource: true,
  }));
  return [first, ...rest];
}

/** Attach an imported image to the current canvas without wiping overlays or other pages. */
export function assignSourceToCurrentPage(pages: LabelPage[], selectedPageId: string): LabelPage[] {
  const target = resolveSelectedPage(pages, selectedPageId);
  if (!target) {
    return [createBlankLabelPage()];
  }
  return pages.map((page) => (page.id === target.id ? { ...page, hasSource: true } : page));
}

function cloneOverlays(overlays: OverlayElement[]): OverlayElement[] {
  return overlays.map((overlay) => ({ ...overlay, id: createOverlayId() }));
}

export function scaleLabelPageX(
  page: LabelPage,
  fromWidthMm: number,
  toWidthMm: number,
): LabelPage {
  if (fromWidthMm === toWidthMm || fromWidthMm <= 0) {
    return page;
  }
  const scale = toWidthMm / fromWidthMm;
  return {
    ...page,
    overlays: page.overlays.map((overlay) => ({
      ...overlay,
      xMm: overlay.xMm * scale,
      widthMm: overlay.widthMm * scale,
    })),
    contentBox: page.contentBox
      ? {
          ...page.contentBox,
          xMm: page.contentBox.xMm * scale,
          widthMm: page.contentBox.widthMm * scale,
        }
      : page.contentBox,
  };
}

export function updateLabelPage(
  pages: LabelPage[],
  id: string,
  patch: Partial<Pick<LabelPage, 'overlays' | 'contentBox' | 'hasSource'>>,
): LabelPage[] {
  return pages.map((page) => (page.id === id ? { ...page, ...patch } : page));
}

export function insertLabelPageAfter(
  pages: LabelPage[],
  afterId: string,
): { pages: LabelPage[]; inserted: LabelPage } {
  const index = pages.findIndex((page) => page.id === afterId);
  const current = index >= 0 ? pages[index] : undefined;
  if (pages.length >= LABEL_PAGE_MAX || index < 0 || !current) {
    return { pages, inserted: current ?? pages[pages.length - 1] ?? createBlankLabelPage() };
  }
  const inserted = createBlankLabelPage();
  const next = [...pages];
  next.splice(index + 1, 0, inserted);
  return { pages: next, inserted };
}

export function duplicateLabelPage(
  pages: LabelPage[],
  id: string,
): { pages: LabelPage[]; inserted: LabelPage } {
  const index = pages.findIndex((page) => page.id === id);
  const source = index >= 0 ? pages[index] : undefined;
  if (pages.length >= LABEL_PAGE_MAX || index < 0 || !source) {
    return { pages, inserted: source ?? pages[pages.length - 1] ?? createBlankLabelPage() };
  }
  const inserted: LabelPage = {
    id: createLabelPageId(),
    overlays: cloneOverlays(source.overlays),
    contentBox: source.contentBox,
    hasSource: source.hasSource,
  };
  const next = [...pages];
  next.splice(index + 1, 0, inserted);
  return { pages: next, inserted };
}

export function removeLabelPage(pages: LabelPage[], id: string): LabelPage[] {
  if (pages.length <= 1) {
    return pages;
  }
  return pages.filter((page) => page.id !== id);
}

export function templatePagesFromLabel(
  pages: LabelPage[],
): Array<{ overlays: OverlayElement[] }> {
  return pages.map((page) => ({
    overlays: page.overlays.map((overlay) => ({ ...overlay })),
  }));
}

export function pagesFromTemplate(
  pages: ReadonlyArray<{ overlays: OverlayElement[] }>,
): LabelPage[] {
  const limited = pages.slice(0, LABEL_PAGE_MAX);
  if (limited.length === 0) {
    return [createBlankLabelPage()];
  }
  return limited.map((page) => ({
    id: createLabelPageId(),
    overlays: cloneOverlays(page.overlays),
    contentBox: null,
    hasSource: false,
  }));
}
