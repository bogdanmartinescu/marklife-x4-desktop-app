import { describe, expect, it } from 'vitest';
import type { PrinterBinding, PrinterInfo } from '@thermalbridge/shared';
import { mergePrinterCatalog, resolveLinkState } from './connection-status.js';

function printer(partial: Partial<PrinterInfo> & Pick<PrinterInfo, 'id' | 'backend'>): PrinterInfo {
  return {
    name: partial.name ?? partial.id,
    systemName: partial.systemName ?? partial.id,
    isDefault: false,
    status: partial.status ?? 'unknown',
    ...partial,
  };
}

const usbBinding: PrinterBinding = {
  printerId: 'usb:1234:5678:0',
  profileId: 'marklife-x4',
  backend: 'usb',
  systemName: '1234:5678',
  displayName: 'USB 1234:5678',
  usbVidPid: '1234:5678',
};

describe('resolveLinkState', () => {
  it('marks USB as connected when the VID:PID is present', () => {
    expect(
      resolveLinkState({
        printerId: usbBinding.printerId,
        binding: usbBinding,
        printers: [],
        usbDevices: [printer({ id: 'usb:1234:5678:0', backend: 'usb', usbVidPid: '1234:5678' })],
        sppPorts: [],
        bleDevices: [],
      }),
    ).toBe('connected');
  });

  it('marks USB as disconnected when the device is missing', () => {
    expect(
      resolveLinkState({
        printerId: usbBinding.printerId,
        binding: usbBinding,
        printers: [],
        usbDevices: [],
        sppPorts: [],
        bleDevices: [],
      }),
    ).toBe('disconnected');
  });

  it('marks Bluetooth SPP as connected when the serial port is listed', () => {
    expect(
      resolveLinkState({
        printerId: 'bt-spp:/dev/cu.X4',
        binding: {
          printerId: 'bt-spp:/dev/cu.X4',
          profileId: 'marklife-x4',
          backend: 'bluetooth-spp',
          systemName: '/dev/cu.X4',
          displayName: 'X4',
          serialPort: '/dev/cu.X4',
        },
        printers: [],
        usbDevices: [],
        sppPorts: [
          printer({
            id: 'bt-spp:/dev/cu.X4',
            backend: 'bluetooth-spp',
            serialPort: '/dev/cu.X4',
          }),
        ],
        bleDevices: [],
      }),
    ).toBe('connected');
  });

  it('returns unknown when no printer is selected', () => {
    expect(
      resolveLinkState({
        printerId: '',
        printers: [],
        usbDevices: [],
        sppPorts: [],
        bleDevices: [],
      }),
    ).toBe('unknown');
  });

  it('lets live USB discovery overwrite an offline bound extra', () => {
    const offline = printer({
      id: 'usb:1234:5678:0',
      backend: 'usb',
      status: 'offline',
      usbVidPid: '1234:5678',
    });
    const live = printer({
      id: 'usb:1234:5678:0',
      backend: 'usb',
      status: 'ready',
      usbVidPid: '1234:5678',
    });
    expect(mergePrinterCatalog([offline], [live])[0]?.status).toBe('ready');
  });

  it('marks Bluetooth BLE as disconnected when the address is not in range', () => {
    expect(
      resolveLinkState({
        printerId: 'bt-ble:aa:bb',
        binding: {
          printerId: 'bt-ble:aa:bb',
          profileId: 'marklife-x4',
          backend: 'bluetooth-ble',
          systemName: 'aa:bb',
          displayName: 'X4 BLE',
          btAddress: 'aa:bb',
        },
        printers: [],
        usbDevices: [],
        sppPorts: [],
        bleDevices: [],
      }),
    ).toBe('disconnected');
  });

  it('marks Bluetooth BLE as connected when the address is in range', () => {
    expect(
      resolveLinkState({
        printerId: 'bt-ble:aa:bb',
        binding: {
          printerId: 'bt-ble:aa:bb',
          profileId: 'marklife-x4',
          backend: 'bluetooth-ble',
          systemName: 'aa:bb',
          displayName: 'X4 BLE',
          btAddress: 'aa:bb',
        },
        printers: [],
        usbDevices: [],
        sppPorts: [],
        bleDevices: [
          printer({
            id: 'bt-ble:aa:bb',
            backend: 'bluetooth-ble',
            btAddress: 'aa:bb',
            status: 'ready',
          }),
        ],
      }),
    ).toBe('connected');
  });

  it('marks a recently seen BLE printer as unknown instead of disconnected', () => {
    expect(
      resolveLinkState({
        printerId: 'bt-ble:aa:bb',
        binding: {
          printerId: 'bt-ble:aa:bb',
          profileId: 'marklife-x4',
          backend: 'bluetooth-ble',
          systemName: 'aa:bb',
          displayName: 'X4 BLE',
          btAddress: 'aa:bb',
        },
        printers: [],
        usbDevices: [],
        sppPorts: [],
        bleDevices: [
          printer({
            id: 'bt-ble:aa:bb',
            backend: 'bluetooth-ble',
            btAddress: 'aa:bb',
            status: 'unknown',
          }),
        ],
      }),
    ).toBe('unknown');
  });
});
