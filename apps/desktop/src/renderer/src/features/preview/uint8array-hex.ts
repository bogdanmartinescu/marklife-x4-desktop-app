export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function installUint8ArrayHex(): void {
  const proto = Uint8Array.prototype as Uint8Array & { toHex?: () => string };
  if (typeof proto.toHex === 'function') {
    return;
  }
  proto.toHex = function toHex(this: Uint8Array): string {
    return bytesToHex(this);
  };
}
