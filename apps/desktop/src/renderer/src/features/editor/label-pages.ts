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

function cloneOverlays(overlays: OverlayElement[]): OverlayElement[] {
  return overlays.map((overlay) => ({ ...overlay, id: createOverlayId() }));
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
