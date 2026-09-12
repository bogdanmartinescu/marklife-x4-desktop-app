import { describe, expect, it } from 'vitest';
import { pdfPageCount } from './pdf.js';
import type { PromiseTryFn } from './pdfjs-polyfills.js';

function minimalPdf(): Uint8Array {
  const objects = [
    '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n',
    '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n',
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 283 425] >>endobj\n',
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(body.length);
    body += object;
  }
  const xrefStart = body.length;
  body += `xref\n0 4\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer<< /Size 4 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return new TextEncoder().encode(body);
}

describe('pdfPageCount', () => {
  it('opens a one-page PDF without Uint8Array.toHex or Promise.try', async () => {
    const proto = Uint8Array.prototype as Uint8Array & { toHex?: () => string };
    const promiseCtor = Promise as unknown as { try?: PromiseTryFn };
    const originalHex = proto.toHex;
    const originalTry = promiseCtor.try;
    delete proto.toHex;
    delete promiseCtor.try;
    try {
      await expect(pdfPageCount(minimalPdf())).resolves.toBe(1);
    } finally {
      if (originalHex) {
        proto.toHex = originalHex;
      } else {
        delete proto.toHex;
      }
      if (originalTry) {
        promiseCtor.try = originalTry;
      } else {
        delete promiseCtor.try;
      }
    }
  });
});
