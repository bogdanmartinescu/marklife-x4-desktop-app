export function mimeFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) {
    return 'application/pdf';
  }
  if (lower.endsWith('.png')) {
    return 'image/png';
  }
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  return '';
}

export function resolveSourceMime(name: string, reportedType = ''): string {
  const fromName = mimeFromName(name);
  if (fromName) {
    return fromName;
  }
  if (reportedType === 'image/jpg') {
    return 'image/jpeg';
  }
  if (
    reportedType === 'application/pdf' ||
    reportedType === 'image/png' ||
    reportedType === 'image/jpeg'
  ) {
    return reportedType;
  }
  return '';
}

function isNodeBufferJson(value: unknown): value is { type: 'Buffer'; data: number[] } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as { type?: unknown; data?: unknown };
  return (
    record.type === 'Buffer' &&
    Array.isArray(record.data) &&
    record.data.every(
      (item) => typeof item === 'number' && Number.isInteger(item) && item >= 0 && item <= 255,
    )
  );
}

function isByteArrayLike(value: unknown): value is ArrayLike<number> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as { length?: unknown };
  if (typeof record.length !== 'number' || !Number.isInteger(record.length) || record.length < 0) {
    return false;
  }
  for (let index = 0; index < record.length; index += 1) {
    const byte = (value as Record<number, unknown>)[index];
    if (typeof byte !== 'number' || !Number.isInteger(byte) || byte < 0 || byte > 255) {
      return false;
    }
  }
  return true;
}

export function toUint8Array(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (isNodeBufferJson(data)) {
    return Uint8Array.from(data.data);
  }
  if (isByteArrayLike(data)) {
    return Uint8Array.from(data);
  }
  throw new Error('Source file did not contain binary data');
}

export function copyToUint8Array(data: unknown): Uint8Array<ArrayBuffer> {
  const bytes = toUint8Array(data);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

export function bytesToBlob(bytes: Uint8Array, mimeType: string): Blob {
  return new Blob([copyToUint8Array(bytes).buffer], { type: mimeType });
}
