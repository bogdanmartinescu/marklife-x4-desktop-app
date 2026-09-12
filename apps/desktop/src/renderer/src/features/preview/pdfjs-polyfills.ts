import { installUint8ArrayHex } from './uint8array-hex.js';

type ComputeFn<K, V> = (key: K) => V;

interface MapUpsert<K, V> {
  getOrInsertComputed?: (key: K, callbackfn: ComputeFn<K, V>) => V;
}

interface WeakMapUpsert<K extends object, V> {
  getOrInsertComputed?: (key: K, callbackfn: ComputeFn<K, V>) => V;
}

type PromiseTry = {
  try?: <T>(callbackFn: (...args: never[]) => T, ...args: never[]) => Promise<Awaited<T>>;
};

export function installPromiseTry(): void {
  const ctor = Promise as PromiseConstructor & PromiseTry;
  if (typeof ctor.try === 'function') {
    return;
  }
  ctor.try = function promiseTry<T>(
    callbackFn: (...args: never[]) => T,
    ...args: never[]
  ): Promise<Awaited<T>> {
    return new Promise((resolve) => {
      resolve(callbackFn(...args));
    });
  };
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
