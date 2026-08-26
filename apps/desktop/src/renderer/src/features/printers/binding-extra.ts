import type { PrinterBinding, PrinterInfo } from '@thermalbridge/shared';

export function usbBindingExtra(device: PrinterInfo): Partial<PrinterBinding> {
  const extra: Partial<PrinterBinding> = {};
  if (device.usbVidPid !== undefined) {
    extra.usbVidPid = device.usbVidPid;
  }
  if (device.usbInterface !== undefined) {
    extra.usbInterface = device.usbInterface;
  }
  return extra;
}

export function serialBindingExtra(device: PrinterInfo): Partial<PrinterBinding> {
  const extra: Partial<PrinterBinding> = {};
  if (device.serialPort !== undefined) {
    extra.serialPort = device.serialPort;
  }
  return extra;
}

export function bleBindingExtra(device: PrinterInfo): Partial<PrinterBinding> {
  const extra: Partial<PrinterBinding> = {};
  if (device.btAddress !== undefined) {
    extra.btAddress = device.btAddress;
  }
  if (device.btServiceUuid !== undefined) {
    extra.btServiceUuid = device.btServiceUuid;
  }
  return extra;
}
