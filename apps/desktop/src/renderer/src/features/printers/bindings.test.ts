import { describe, expect, it } from 'vitest';
import type { PrinterBinding, PrinterInfo } from '@thermalbridge/shared';
import { boundPrinterIds, canForgetPrinter, removeBinding, upsertBinding } from './bindings.js';

const binding: PrinterBinding = {
  printerId: 'usb:1',
  profileId: 'marklife-x4',
  backend: 'usb',
  systemName: '1234:5678',
  displayName: 'X4',
  usbVidPid: '1234:5678',
};

function device(patch: Partial<PrinterInfo> = {}): PrinterInfo {
  return {
    id: 'usb:1',
    name: 'X4',
    systemName: '1234:5678',
    isDefault: false,
    status: 'offline',
    backend: 'usb',
    ...patch,
  };
}

describe('upsertBinding', () => {
  it('replaces a binding with the same printer id', () => {
    const next = upsertBinding([binding], { ...binding, displayName: 'X4 USB' });
    expect(next).toHaveLength(1);
    expect(next[0]?.displayName).toBe('X4 USB');
  });
});

describe('removeBinding', () => {
  it('drops the matching printer and leaves the rest', () => {
    const other: PrinterBinding = { ...binding, printerId: 'tcp:1', backend: 'tcp', displayName: 'LAN' };
    expect(removeBinding([binding, other], 'usb:1').map((item) => item.printerId)).toEqual(['tcp:1']);
  });
});

describe('canForgetPrinter', () => {
  const bound = boundPrinterIds([binding]);

  it('allows forgetting a saved printer that is not connected', () => {
    expect(canForgetPrinter(device(), bound, 'disconnected')).toBe(true);
    expect(canForgetPrinter(device({ status: 'offline' }), bound, 'unknown')).toBe(true);
  });

  it('keeps a live connected printer in the list', () => {
    expect(canForgetPrinter(device({ status: 'ready' }), bound, 'connected')).toBe(false);
  });

  it('allows forgetting saved TCP printers', () => {
    expect(
      canForgetPrinter(device({ id: 'tcp:1', backend: 'tcp', status: 'unknown' }), new Set(['tcp:1']), 'unknown'),
    ).toBe(true);
  });

  it('does not forget devices that were never saved', () => {
    expect(canForgetPrinter(device(), new Set(), 'disconnected')).toBe(false);
  });
});
