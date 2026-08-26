import type { PrinterInfo } from '@thermalbridge/shared';

export const BLE_GRACE_MS = 25_000;

export interface BleSighting {
  device: PrinterInfo;
  lastSeenAt: number;
}

export function rememberBleSightings(
  previous: BleSighting[],
  live: PrinterInfo[],
  now: number,
  graceMs = BLE_GRACE_MS,
): BleSighting[] {
  const liveIds = new Set(live.map((device) => device.id));
  const byId = new Map<string, BleSighting>();
  for (const item of previous) {
    byId.set(item.device.id, item);
  }
  for (const device of live) {
    byId.set(device.id, { device: { ...device, status: 'ready' }, lastSeenAt: now });
  }
  const next: BleSighting[] = [];
  for (const item of byId.values()) {
    if (now - item.lastSeenAt > graceMs) {
      continue;
    }
    if (liveIds.has(item.device.id)) {
      next.push(item);
      continue;
    }
    next.push({
      ...item,
      device: { ...item.device, status: 'unknown' },
    });
  }
  return next;
}

export function devicesFromSightings(sightings: BleSighting[]): PrinterInfo[] {
  return sightings.map((item) => item.device);
}
