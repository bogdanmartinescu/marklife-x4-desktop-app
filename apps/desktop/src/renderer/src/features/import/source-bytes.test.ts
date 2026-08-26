import { describe, expect, it } from 'vitest';
import {
  bytesToBlob,
  copyToUint8Array,
  mimeFromName,
  resolveSourceMime,
  toUint8Array,
} from './source-bytes.js';

describe('mimeFromName', () => {
  it('maps PDF, PNG and JPEG extensions', () => {
    expect(mimeFromName('awb.PDF')).toBe('application/pdf');
    expect(mimeFromName('label.png')).toBe('image/png');
    expect(mimeFromName('scan.jpg')).toBe('image/jpeg');
    expect(mimeFromName('scan.jpeg')).toBe('image/jpeg');
    expect(mimeFromName('notes.txt')).toBe('');
  });
});

describe('resolveSourceMime', () => {
  it('prefers the file extension over a generic OS type', () => {
    expect(resolveSourceMime('awb.pdf', 'application/octet-stream')).toBe('application/pdf');
    expect(resolveSourceMime('label.PNG', 'application/octet-stream')).toBe('image/png');
    expect(resolveSourceMime('scan.jpg', 'image/jpg')).toBe('image/jpeg');
  });

  it('uses a reported type when the name has no known extension', () => {
    expect(resolveSourceMime('untitled', 'application/pdf')).toBe('application/pdf');
    expect(resolveSourceMime('untitled', 'image/jpg')).toBe('image/jpeg');
    expect(resolveSourceMime('notes.txt', 'text/plain')).toBe('');
  });
});

describe('toUint8Array', () => {
  it('keeps Uint8Array values', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    expect(toUint8Array(bytes)).toEqual(bytes);
  });

  it('copies ArrayBuffer and ArrayBufferView values from IPC', () => {
    const buffer = new Uint8Array([9, 8, 7]).buffer;
    expect(toUint8Array(buffer)).toEqual(new Uint8Array([9, 8, 7]));
    expect(toUint8Array(new Uint16Array([1]))).toBeInstanceOf(Uint8Array);
  });

  it('rebuilds Node Buffer JSON and numeric-key clones from contextBridge', () => {
    expect(toUint8Array({ type: 'Buffer', data: [137, 80, 78] })).toEqual(
      new Uint8Array([137, 80, 78]),
    );
    expect(toUint8Array({ 0: 255, 1: 0, 2: 16, length: 3 })).toEqual(new Uint8Array([255, 0, 16]));
  });

  it('rejects values that are not binary', () => {
    expect(() => toUint8Array({ hello: 'nope' })).toThrow(/binary/i);
  });
});

describe('copyToUint8Array', () => {
  it('returns a detached copy so later transfers cannot empty the source', () => {
    const original = new Uint8Array([1, 2, 3]);
    const copy = copyToUint8Array(original);
    copy[0] = 9;
    expect(original[0]).toBe(1);
    expect(copy.buffer).not.toBe(original.buffer);
  });
});

describe('bytesToBlob', () => {
  it('builds a blob from a copy of the bytes', async () => {
    const pngMagic = new Uint8Array([137, 80, 78, 71]);
    const blob = bytesToBlob(pngMagic, 'image/png');
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBe(4);
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(pngMagic);
  });
});
