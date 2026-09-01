import type { SourceDocument } from '@/state/types.js';

export interface PageSourceAssets {
  document: SourceDocument;
  previewUrl: string;
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
}

export type PageSourceMap = Record<string, PageSourceAssets>;

export function sourceUrlsFromMap(map: PageSourceMap): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const [pageId, assets] of Object.entries(map)) {
    urls[pageId] = assets.previewUrl;
  }
  return urls;
}

export function putPageSource(
  map: PageSourceMap,
  pageId: string,
  assets: PageSourceAssets,
  revokeUrl: (url: string) => void,
): PageSourceMap {
  const previous = map[pageId];
  if (previous && previous.previewUrl !== assets.previewUrl) {
    const stillUsed = Object.entries(map).some(
      ([id, item]) => id !== pageId && item.previewUrl === previous.previewUrl,
    );
    if (!stillUsed) {
      revokeUrl(previous.previewUrl);
    }
  }
  return { ...map, [pageId]: assets };
}

export function releasePageSource(
  map: PageSourceMap,
  pageId: string,
  revokeUrl: (url: string) => void,
): PageSourceMap {
  const previous = map[pageId];
  if (!previous) {
    return map;
  }
  const next: PageSourceMap = { ...map };
  delete next[pageId];
  const stillUsed = Object.values(next).some((item) => item.previewUrl === previous.previewUrl);
  if (!stillUsed) {
    revokeUrl(previous.previewUrl);
  }
  return next;
}

export function releaseAllPageSources(map: PageSourceMap, revokeUrl: (url: string) => void): void {
  const seen = new Set<string>();
  for (const assets of Object.values(map)) {
    if (seen.has(assets.previewUrl)) {
      continue;
    }
    seen.add(assets.previewUrl);
    revokeUrl(assets.previewUrl);
  }
}
