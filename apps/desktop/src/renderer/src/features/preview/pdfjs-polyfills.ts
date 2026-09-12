import { installUint8ArrayHex } from './uint8array-hex.js';

type ComputeFn<K, V> = (key: K) => V;

interface MapUpsert<K, V> {
  getOrInsertComputed?: (key: K, callbackfn: ComputeFn<K, V>) => V;
}

interface WeakMapUpsert<K extends object, V> {
  getOrInsertComputed?: (key: K, callbackfn: ComputeFn<K, V>) => V;
}

export type PromiseTryFn = (
  callbackFn: (...args: unknown[]) => unknown,
  ...args: unknown[]
) => Promise<unknown>;

export function installPromiseTry(): PromiseTryFn {
  const ctor = Promise as unknown as { try?: PromiseTryFn };
  if (typeof ctor.try !== 'function') {
    ctor.try = (callbackFn, ...args) =>
      new Promise((resolve) => {
        resolve(callbackFn(...args));
      });
  }
  const installed = ctor.try;
  if (installed === undefined) {
    throw new Error('Promise.try was not installed');
  }
  return installed;
}

export function installMapGetOrInsertComputed(): void {
  const mapProto = Map.prototype as Map<unknown, unknown> & MapUpsert<unknown, unknown>;
  if (typeof mapProto.getOrInsertComputed !== 'function') {
    mapProto.getOrInsertComputed = function getOrInsertComputed<K, V>(
      this: Map<K, V>,
      key: K,
      callbackfn: ComputeFn<K, V>,
    ): V {
      if (this.has(key)) {
        return this.get(key) as V;
      }
      const value = callbackfn(key);
      this.set(key, value);
      return value;
    };
  }

  const weakProto = WeakMap.prototype as WeakMap<object, unknown> &
    WeakMapUpsert<object, unknown>;
  if (typeof weakProto.getOrInsertComputed !== 'function') {
    weakProto.getOrInsertComputed = function getOrInsertComputed<K extends object, V>(
      this: WeakMap<K, V>,
      key: K,
      callbackfn: ComputeFn<K, V>,
    ): V {
      if (this.has(key)) {
        return this.get(key) as V;
      }
      const value = callbackfn(key);
      this.set(key, value);
      return value;
    };
  }
}

installMapGetOrInsertComputed();
installPromiseTry();
installUint8ArrayHex();
