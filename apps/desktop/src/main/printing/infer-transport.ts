import type { PrinterBackend } from '@thermalbridge/shared';

export function inferTransport(
  printerId: string,
  bindingBackend: PrinterBackend | undefined,
): PrinterBackend {
  if (bindingBackend !== undefined) {
    return bindingBackend;
  }
  if (printerId.startsWith('bt-spp:')) {
    return 'bluetooth-spp';
  }
  if (printerId.startsWith('bt-ble:')) {
    return 'bluetooth-ble';
  }
  if (printerId.startsWith('usb:')) {
    return 'usb';
  }
  if (printerId.startsWith('tcp:')) {
    return 'tcp';
  }
  return process.platform === 'win32' ? 'windows-spooler' : 'cups';
}
