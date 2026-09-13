import { describe, expect, it } from 'vitest';
import { sourceFilmstripItems } from './source-filmstrip.js';

function pdf(pageId: string, pageNumber: number): {
  pageId: string;
  mimeType: string;
  pageNumber: number;
  pageCount: number;
  previewUrl: string;
  name: string;
} {
  return {
    pageId,
    mimeType: 'application/pdf',
    pageNumber,
    pageCount: 3,
    previewUrl: `blob:${pageId}`,
    name: 'awb.pdf',
  };
}

describe('sourceFilmstripItems', () => {
  it('returns nothing for a single page or non-PDF sources', () => {
    expect(sourceFilmstripItems([pdf('a', 1)])).toEqual([]);
    expect(
      sourceFilmstripItems([
        { ...pdf('a', 1), mimeType: 'image/png' },
        { ...pdf('b', 2), mimeType: 'image/png' },
      ]),
    ).toEqual([]);
    expect(
      sourceFilmstripItems([
        { ...pdf('a', 1), previewUrl: '' },
        { ...pdf('b', 2), previewUrl: '' },
      ]),
    ).toEqual([]);
  });

  it('keeps multi-page PDF previews in document order', () => {
    const items = sourceFilmstripItems([pdf('a', 1), pdf('b', 2), pdf('c', 3)]);
    expect(items.map((item) => item.pageNumber)).toEqual([1, 2, 3]);
    expect(items).toHaveLength(3);
  });
});
