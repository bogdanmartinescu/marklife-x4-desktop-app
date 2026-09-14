import type { PrinterBinding, PrinterInfo } from '@thermalbridge/shared';
import type { LinkState } from './connection-status.js';

export function upsertBinding(list: readonly PrinterBinding[], binding: PrinterBinding): PrinterBinding[] {
  return [...list.filter((item) => item.printerId !== binding.printerId), binding];
}

export function removeBinding(list: readonly PrinterBinding[], printerId: string): PrinterBinding[] {
  return list.filter((item) => item.printerId !== printerId);
}

export function boundPrinterIds(list: readonly PrinterBinding[]): Set<string> {
  return new Set(list.map((item) => item.printerId));
}

export function canForgetPrinter(
  device: PrinterInfo,
  boundIds: ReadonlySet<string>,
  state: LinkState,
): boolean {
  if (!boundIds.has(device.id)) {
    return false;
  }
  if (device.backend === 'tcp') {
    return true;
  }
  return state !== 'connected';
}
