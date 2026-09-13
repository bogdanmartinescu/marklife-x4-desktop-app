export interface SourceFilmstripInput {
  pageId: string;
  mimeType: string;
  pageNumber: number;
  pageCount: number;
  previewUrl: string;
  name: string;
}

export interface SourceFilmstripItem {
  pageId: string;
  pageNumber: number;
  pageCount: number;
  previewUrl: string;
  name: string;
}

export function sourceFilmstripItems(
  sources: readonly SourceFilmstripInput[],
): SourceFilmstripItem[] {
  const items: SourceFilmstripItem[] = [];
  for (const source of sources) {
    if (source.mimeType !== 'application/pdf' || source.previewUrl.length === 0) {
      continue;
    }
    items.push({
      pageId: source.pageId,
      pageNumber: source.pageNumber,
      pageCount: source.pageCount,
      previewUrl: source.previewUrl,
      name: source.name,
    });
  }
  return items.length > 1 ? items : [];
}
