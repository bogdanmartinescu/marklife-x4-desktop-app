import { describe, expect, it } from 'vitest';
import {
  isMediaMimeType,
  isSafeLibraryId,
  MediaFileMetaSchema,
} from '../src/library.js';

describe('isSafeLibraryId', () => {
  it('accepts a media UUID and rejects path traversal', () => {
    expect(isSafeLibraryId('med-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')).toBe(true);
    expect(isSafeLibraryId('../etc/passwd')).toBe(false);
    expect(isSafeLibraryId('med-not-a-uuid')).toBe(false);
  });
});

describe('isMediaMimeType', () => {
  it('accepts PDF and PNG and rejects octet-stream', () => {
    expect(isMediaMimeType('application/pdf')).toBe(true);
    expect(isMediaMimeType('image/png')).toBe(true);
    expect(isMediaMimeType('application/octet-stream')).toBe(false);
  });
});

describe('MediaFileMetaSchema', () => {
  it('requires a 64-character sha256', () => {
    const parsed = MediaFileMetaSchema.safeParse({
      id: 'med-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      name: 'a.png',
      mimeType: 'image/png',
      byteLength: 12,
      sha256: 'a'.repeat(64),
      createdAt: '2026-09-12T00:00:00.000Z',
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }
    expect(MediaFileMetaSchema.safeParse({ ...parsed.data, sha256: 'short' }).success).toBe(false);
  });
});
