import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { writeJobFile } from './job-writer.js';

describe('writeJobFile', () => {
  it('writes the job bytes with a sanitized extension', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tb-job-'));
    const path = writeJobFile(dir, new Uint8Array([1, 2, 3]), 'png!');
    expect(path.endsWith('.png')).toBe(true);
    expect(Array.from(readFileSync(path))).toEqual([1, 2, 3]);
  });
});
