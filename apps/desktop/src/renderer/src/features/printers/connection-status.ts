import type { PrinterBinding, PrinterInfo } from '@thermalbridge/shared';

export type LinkState = 'connected' | 'disconnected' | 'unknown';

export function mergePrinterCatalog(...lists: PrinterInfo[][]): PrinterInfo[] {
  const byId = new Map<string, PrinterInfo>();
  for (const list of lists) {
    for (const item of list) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()];
}

export function linkStateFromDevice(device: PrinterInfo): LinkState {
  if (device.status === 'offline' || device.status === 'error') {
    return 'disconnected';
  }
  if (device.status === 'unknown') {
    return 'unknown';
  }
  return 'connected';
}

export function resolveLinkState(options: {
  printerId: string;
  binding?: PrinterBinding;
  printers: PrinterInfo[];
  usbDevices: PrinterInfo[];
  sppPorts: PrinterInfo[];
  bleDevices: PrinterInfo[];
}): LinkState {
  if (!options.printerId) {
    return 'unknown';
  }

  const discovered = options.printers.find((item) => item.id === options.printerId);
  const backend = options.binding?.backend ?? discovered?.backend;
  if (!backend) {
    return 'unknown';
  }

  switch (backend) {
    case 'usb': {
      const vidPid = options.binding?.usbVidPid;
      const present = options.usbDevices.some(
        (item) =>
          item.id === options.printerId ||
          (vidPid !== undefined && item.usbVidPid === vidPid),
      );
      return present ? 'connected' : 'disconnected';
    }
    case 'bluetooth-spp': {
      const port = options.binding?.serialPort ?? discovered?.serialPort;
      const present = options.sppPorts.some(
        (item) =>
          item.id === options.printerId ||
          (port !== undefined && item.serialPort === port),
      );
      return present ? 'connected' : 'disconnected';
    }
    case 'bluetooth-ble': {
      const address = options.binding?.btAddress ?? discovered?.btAddress;
      const match = options.bleDevices.find(
        (item) =>
          item.id === options.printerId ||
          (address !== undefined && item.btAddress === address),
      );
      if (!match) {
        return 'disconnected';
      }
      return linkStateFromDevice(match);
    }
    case 'tcp':
      return 'unknown';
    default: {
      if (!discovered) {
        return 'disconnected';
      }
      return discovered.status === 'offline' ? 'disconnected' : 'connected';
    }
  }
}
