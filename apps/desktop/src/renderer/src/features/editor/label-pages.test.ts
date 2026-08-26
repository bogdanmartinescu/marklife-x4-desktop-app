import { describe, expect, it } from 'vitest';
import { createTextOverlay } from './overlay.js';
import {
  LABEL_PAGE_MAX,
  createBlankLabelPage,
  duplicateLabelPage,
  insertLabelPageAfter,
  removeLabelPage,
  updateLabelPage,
} from './label-pages.js';

describe('label pages', () => {
  it('starts with a blank page', () => {
    const page = createBlankLabelPage();
    expect(page.id.startsWith('page-')).toBe(true);
    expect(page.overlays).toEqual([]);
    expect(page.contentBox).toBeNull();
    expect(page.hasSource).toBe(false);
  });

  it('inserts a blank page after the given page', () => {
    const first = createBlankLabelPage();
    const second = createBlankLabelPage();
    const result = insertLabelPageAfter([first, second], first.id);
    expect(result.pages).toHaveLength(3);
    expect(result.pages[0]?.id).toBe(first.id);
    expect(result.pages[1]?.id).toBe(result.inserted.id);
    expect(result.pages[2]?.id).toBe(second.id);
    expect(result.inserted.overlays).toEqual([]);
  });

  it('duplicates a page with new ids and the same layout', () => {
    const overlay = createTextOverlay(100, 150);
    overlay.text = 'Hello';
    const source = {
      ...createBlankLabelPage(),
      overlays: [overlay],
      hasSource: true,
      contentBox: { xMm: 1, yMm: 2, widthMm: 30, heightMm: 40 },
    };
    const result = duplicateLabelPage([source], source.id);
    const copy = result.inserted;
    expect(result.pages).toHaveLength(2);
    expect(copy.id).not.toBe(source.id);
    expect(copy.hasSource).toBe(true);
    expect(copy.contentBox).toEqual(source.contentBox);
    expect(copy.overlays).toHaveLength(1);
    expect(copy.overlays[0]?.id).not.toBe(overlay.id);
    expect(copy.overlays[0]?.text).toBe('Hello');
    expect(copy.overlays[0]?.xMm).toBe(overlay.xMm);
  });

  it('does not remove the last remaining page', () => {
    const only = createBlankLabelPage();
    expect(removeLabelPage([only], only.id)).toEqual([only]);
  });

  it('removes a page and keeps the others', () => {
    const first = createBlankLabelPage();
    const second = createBlankLabelPage();
    const next = removeLabelPage([first, second], first.id);
    expect(next.map((page) => page.id)).toEqual([second.id]);
  });

  it('updates overlays on one page only', () => {
    const first = createBlankLabelPage();
    const second = createBlankLabelPage();
    const overlay = createTextOverlay(40, 30);
    const next = updateLabelPage([first, second], second.id, { overlays: [overlay] });
    expect(next[0]?.overlays).toEqual([]);
    expect(next[1]?.overlays).toEqual([overlay]);
  });

  it('refuses to grow past the page cap', () => {
    const pages = Array.from({ length: LABEL_PAGE_MAX }, () => createBlankLabelPage());
    const last = pages[LABEL_PAGE_MAX - 1];
    expect(last).toBeDefined();
    if (!last) {
      return;
    }
    const result = insertLabelPageAfter(pages, last.id);
    expect(result.pages).toHaveLength(LABEL_PAGE_MAX);
    expect(result.inserted.id).toBe(last.id);
  });
});
