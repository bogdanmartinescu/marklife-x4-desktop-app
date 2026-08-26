import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export function writeJobFile(jobDir: string, bytes: Uint8Array): string {
  mkdirSync(jobDir, { recursive: true });
  const filePath = join(jobDir, `job-${randomUUID()}.prn`);
  writeFileSync(filePath, bytes);
  return filePath;
}
