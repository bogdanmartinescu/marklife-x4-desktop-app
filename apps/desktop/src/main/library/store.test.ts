import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  LIBRARY_MAX_ITEMS,
  TEMPLATE_MAX_ITEMS,
  ThermalBridgeError,
  isSafeLibraryId,
} from '@thermalbridge/shared';
import { LibraryStore } from './store.js';

function historyInput(png: Uint8Array) {
  return {
    jobName: 'Label 1/1',
    printerId: 'bt-ble:aa',
    printerName: 'M110',
    profileId: 'phomemo-m110',
    widthMm: 40,
    heightMm: 30,
    width: 320,
    height: 240,
    dpi: 203,
    copies: 1,
    density: 8,
    speed: 4,
    mediaMode: 'gap' as const,
    gapHeightMm: 2,
    gapOffsetMm: 0,
    markHeightMm: 3,
    markOffsetMm: 0,
    dither: 'threshold' as const,
    threshold: 128,
    rotation: 0 as const,
    mirrorX: false,
    mirrorY: false,
    negative: false,
    offsetXmm: 0,
    offsetYmm: 0,
    fitMode: 'actual' as const,
    png,
  };
}

describe('isSafeLibraryId', () => {
  it('accepts generated ids and rejects path traversal', () => {
    expect(isSafeLibraryId('med-0516f47a-2399-c6af-39e3-4a733dcc83a3')).toBe(true);
    expect(isSafeLibraryId('job-0516f47a-2399-c6af-39e3-4a733dcc83a3')).toBe(true);
    expect(isSafeLibraryId('tpl-0516f47a-2399-c6af-39e3-4a733dcc83a3')).toBe(true);
    expect(isSafeLibraryId('../etc/passwd')).toBe(false);
    expect(isSafeLibraryId('med-../secret')).toBe(false);
  });
});

describe('LibraryStore', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function store(): LibraryStore {
    const dir = mkdtempSync(join(tmpdir(), 'tb-library-'));
    dirs.push(dir);
    return new LibraryStore(dir);
  }

  it('stores uploaded media and returns it by id', () => {
    const library = store();
    const data = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
    const added = library.addMedia('awb.png', 'image/png', data);
    expect(added.name).toBe('awb.png');
    expect(added.mimeType).toBe('image/png');
    expect(added.byteLength).toBe(7);
    expect(added.sha256).toHaveLength(64);
    const loaded = library.getMedia(added.id);
    expect(loaded.meta.id).toBe(added.id);
    expect(loaded.data).toEqual(data);
    expect(library.listMedia()).toHaveLength(1);
  });

  it('reuses an existing media file with the same hash', () => {
    const library = store();
    const data = new Uint8Array([1, 2, 3, 4]);
    const first = library.addMedia('one.png', 'image/png', data);
    const second = library.addMedia('two.png', 'image/png', data);
    expect(second.id).toBe(first.id);
    expect(library.listMedia()).toHaveLength(1);
  });

  it('rejects unsupported media types', () => {
    const library = store();
    expect(() => library.addMedia('notes.txt', 'text/plain', new Uint8Array([1]))).toThrow(
      ThermalBridgeError,
    );
  });

  it('stores print history pngs newest first', () => {
    const library = store();
    const first = library.addHistory(historyInput(new Uint8Array([1, 2])));
    const second = library.addHistory(historyInput(new Uint8Array([3, 4])));
    expect(library.listHistory().map((item) => item.id)).toEqual([second.id, first.id]);
    expect(library.getHistoryPng(second.id)).toEqual(new Uint8Array([3, 4]));
  });

  it('removes media and history items', () => {
    const library = store();
    const media = library.addMedia('a.png', 'image/png', new Uint8Array([9]));
    const job = library.addHistory(historyInput(new Uint8Array([8])));
    library.removeMedia(media.id);
    library.removeHistory(job.id);
    expect(library.listMedia()).toEqual([]);
    expect(library.listHistory()).toEqual([]);
    expect(() => library.getMedia(media.id)).toThrow(ThermalBridgeError);
  });

  it('caps history at the library limit', () => {
    const library = store();
    for (let index = 0; index < LIBRARY_MAX_ITEMS + 3; index += 1) {
      library.addHistory(historyInput(new Uint8Array([index])));
    }
    expect(library.listHistory()).toHaveLength(LIBRARY_MAX_ITEMS);
  });

  it('stores reusable label templates and returns them by id', () => {
    const library = store();
    const saved = library.saveTemplate({
      name: '  Shipping  ',
      widthMm: 40,
      heightMm: 30,
      pages: [{ overlays: [] }],
    });
    expect(saved.id.startsWith('tpl-')).toBe(true);
    expect(saved.name).toBe('Shipping');
    expect(library.listTemplates()).toHaveLength(1);
    expect(library.getTemplate(saved.id).widthMm).toBe(40);
    const renamed = library.saveTemplate({
      id: saved.id,
      name: 'Outbound',
      widthMm: 50,
      heightMm: 30,
      pages: [{ overlays: [] }],
    });
    expect(renamed.id).toBe(saved.id);
    expect(renamed.name).toBe('Outbound');
    expect(renamed.widthMm).toBe(50);
    expect(library.listTemplates()).toHaveLength(1);
    library.removeTemplate(saved.id);
    expect(library.listTemplates()).toEqual([]);
    expect(() => library.getTemplate(saved.id)).toThrow(ThermalBridgeError);
  });

  it('caps templates at the template limit', () => {
    const library = store();
    for (let index = 0; index < TEMPLATE_MAX_ITEMS + 2; index += 1) {
      library.saveTemplate({
        name: `T${String(index)}`,
        widthMm: 40,
        heightMm: 30,
        pages: [{ overlays: [] }],
      });
    }
    expect(library.listTemplates()).toHaveLength(TEMPLATE_MAX_ITEMS);
  });
});
