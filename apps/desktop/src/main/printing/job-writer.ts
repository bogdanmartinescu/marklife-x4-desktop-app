import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export function writeJobFile(jobDir: string, bytes: Uint8Array, extension = 'prn'): string {
  mkdirSync(jobDir, { recursive: true });
  const suffix = extension.replace(/[^a-z0-9]/gi, '') || 'prn';
  const filePath = join(jobDir, `job-${randomUUID()}.${suffix}`);
  writeFileSync(filePath, bytes);
  return filePath;
}
