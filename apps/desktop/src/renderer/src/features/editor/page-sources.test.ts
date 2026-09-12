import { describe, expect, it, vi } from 'vitest';
import {
  putPageSource,
  releasePageSource,
  revertEnhancedSource,
  sourceUrlsFromMap,
  type PageSourceAssets,
} from './page-sources.js';
import type { SourceDocument } from '@/state/types.js';

const document: SourceDocument = {
  name: 'a.png',
  mimeType: 'image/png',
  bytes: new Uint8Array(),
  pageCount: 1,
  pageNumber: 1,
};

function assets(url: string): PageSourceAssets {
  return {
    document,
    previewUrl: url,
    width: 8,
    height: 8,
    canvas: {} as HTMLCanvasElement,
  };
}

describe('page sources', () => {
  it('stores a source on one canvas without dropping another', () => {
    const first = putPageSource({}, 'page-1', assets('blob:one'), () => undefined);
    const both = putPageSource(first, 'page-2', assets('blob:two'), () => undefined);
    expect(sourceUrlsFromMap(both)).toEqual({ 'page-1': 'blob:one', 'page-2': 'blob:two' });
  });

  it('revokes a replaced preview only when no other page shares it', () => {
    const revoke = vi.fn();
    const shared = assets('blob:shared');
    const withShare = putPageSource(
      putPageSource({}, 'page-1', shared, revoke),
      'page-2',
      shared,
      revoke,
    );
    const next = putPageSource(withShare, 'page-2', assets('blob:new'), revoke);
    expect(revoke).not.toHaveBeenCalled();
    releasePageSource(next, 'page-1', revoke);
    expect(revoke).toHaveBeenCalledWith('blob:shared');
  });

  it('reverts an enhanced source to the original canvas and clears enhanced', () => {
    const original = { width: 10, height: 6 } as HTMLCanvasElement;
    const enhanced = {
      ...assets('blob:enhanced'),
      width: 10,
      height: 6,
      canvas: { width: 10, height: 6 } as HTMLCanvasElement,
      originalCanvas: original,
      enhanced: true,
    };
    const reverted = revertEnhancedSource(enhanced, 'blob:original');
    expect(reverted).toEqual({
      document,
      previewUrl: 'blob:original',
      width: 10,
      height: 6,
      canvas: original,
    });
    expect(reverted?.enhanced).toBeUndefined();
    expect(reverted?.originalCanvas).toBeUndefined();
  });

  it('is a no-op when there is no original canvas', () => {
    expect(revertEnhancedSource(assets('blob:one'), 'blob:two')).toBeNull();
  });
});
