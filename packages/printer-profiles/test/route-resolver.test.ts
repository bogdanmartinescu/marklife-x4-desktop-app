import { describe, expect, it } from 'vitest';
import { resolveRoute } from '../src/route-resolver.js';

describe('resolveRoute', () => {
  it('selects TSPL for the X4 OS-queue route', () => {
    const result = resolveRoute({
      modelId: 'marklife-x4',
      transport: 'cups',
    });
    expect(result.kind).toBe('resolved');
    if (result.kind !== 'resolved') {
      return;
    }
    expect(result.route.protocol).toBe('tspl');
    expect(result.route.codec).toBe('raw-mono-1bpp');
  });

  it('selects TSPL for the X4 Windows spooler and USB candidate routes', () => {
    for (const transport of ['windows-spooler', 'usb', 'tcp'] as const) {
      const result = resolveRoute({
        modelId: 'marklife-x4',
        transport,
      });
      expect(result.kind).toBe('resolved');
      if (result.kind === 'resolved') {
        expect(result.route.protocol).toBe('tspl');
      }
    }
  });

  it('selects Marklife protocol 7 for X4 Bluetooth SPP, not TSPL', () => {
    const result = resolveRoute({
      modelId: 'marklife-x4',
      transport: 'bluetooth-spp',
    });
    expect(result.kind).toBe('resolved');
    if (result.kind !== 'resolved') {
      return;
    }
    expect(result.route.id).toBe('x4-spp-v7');
    expect(result.route.protocol).toBe('marklife-x4-bt-v7');
    expect(result.route.codec).toBe('jbig-t85');
    expect(result.route.session).toBe('marklife-spp');
    expect(result.route.protocol).not.toBe('tspl');
    expect(result.route.status).toBe('candidate');
  });

  it('does not silently fall back from protocol 7 to TSPL', () => {
    const result = resolveRoute({
      modelId: 'marklife-x4',
      transport: 'bluetooth-spp',
    });
    expect(result.kind).toBe('resolved');
    if (result.kind !== 'resolved') {
      return;
    }
    expect('experimentalTsplFallback' in result.route).toBe(false);
    expect(result.route.protocol).toBe('marklife-x4-bt-v7');
  });

  it('exposes X4 + SPP + raw TSPL only as an explicit diagnostic route', () => {
    const result = resolveRoute({
      modelId: 'marklife-x4',
      transport: 'bluetooth-spp',
      diagnostic: 'x4-spp-raw-tspl',
    });
    expect(result.kind).toBe('resolved');
    if (result.kind !== 'resolved') {
      return;
    }
    expect(result.route.id).toBe('x4-spp-raw-tspl');
    expect(result.route.protocol).toBe('tspl');
    expect(result.route.status).toBe('experimental');
    expect(result.route.session).toBe('raw-stream');
  });

  it('uses experimental TSPL on X4 BLE after a physical X4 advertisement', () => {
    const result = resolveRoute({
      modelId: 'marklife-x4',
      transport: 'bluetooth-ble',
    });
    expect(result.kind).toBe('resolved');
    if (result.kind !== 'resolved') {
      return;
    }
    expect(result.route.id).toBe('x4-ble-raw-tspl');
    expect(result.route.protocol).toBe('tspl');
    expect(result.route.codec).toBe('raw-mono-1bpp');
    expect(result.route.session).toBe('raw-stream');
    expect(result.route.status).toBe('experimental');
    expect(result.route.protocol).not.toBe('marklife-x4-bt-v7');
  });

  it('selects ESC/POS for D210 OS/USB/TCP routes and does not use TSPL', () => {
    for (const transport of ['cups', 'windows-spooler', 'usb', 'tcp'] as const) {
      const result = resolveRoute({
        modelId: 'marklife-d210',
        transport,
      });
      expect(result.kind).toBe('resolved');
      if (result.kind === 'resolved') {
        expect(result.route.protocol).toBe('esc-pos');
        expect(result.route.protocol).not.toBe('tspl');
      }
    }
  });

  it('selects Marklife protocol 5 for D210 Bluetooth SPP, not ESC/POS or TSPL', () => {
    const result = resolveRoute({
      modelId: 'marklife-d210',
      transport: 'bluetooth-spp',
    });
    expect(result.kind).toBe('resolved');
    if (result.kind !== 'resolved') {
      return;
    }
    expect(result.route.protocol).toBe('marklife-d210-bt-v5');
    expect(result.route.codec).toBe('marklife-d210');
    expect(result.route.protocol).not.toBe('esc-pos');
    expect(result.route.protocol).not.toBe('tspl');
  });

  it('does not create a canonical D210 BLE route until hardware verifies it', () => {
    const result = resolveRoute({
      modelId: 'marklife-d210',
      transport: 'bluetooth-ble',
      advertised: { ble: true },
    });
    expect(result.kind).toBe('unsupported');
  });

  it('selects Marklife protocol 3 for P50 Bluetooth SPP without guessing TSPL or ESC/POS', () => {
    const result = resolveRoute({
      modelId: 'marklife-p50',
      transport: 'bluetooth-spp',
    });
    expect(result.kind).toBe('resolved');
    if (result.kind !== 'resolved') {
      return;
    }
    expect(result.route.protocol).toBe('marklife-p50-bt-v3');
    expect(result.route.protocol).not.toBe('tspl');
    expect(result.route.protocol).not.toBe('esc-pos');
  });

  it('does not invent a P50 OS-queue language', () => {
    const result = resolveRoute({
      modelId: 'marklife-p50',
      transport: 'cups',
    });
    expect(result.kind).toBe('unsupported');
  });

  it('selects Phomemo M110 ESC/POS over BLE', () => {
    const result = resolveRoute({
      modelId: 'phomemo-m110',
      transport: 'bluetooth-ble',
    });
    expect(result.kind).toBe('resolved');
    if (result.kind !== 'resolved') {
      return;
    }
    expect(result.route.protocol).toBe('phomemo-m110');
    expect(result.route.codec).toBe('raw-mono-1bpp');
    expect(result.route.session).toBe('phomemo-ble-paced');
  });

  it('sends Canon inkjet jobs as a CUPS document PNG, not TSPL', () => {
    const result = resolveRoute({
      modelId: 'canon-inkjet',
      transport: 'cups',
    });
    expect(result.kind).toBe('resolved');
    if (result.kind !== 'resolved') {
      return;
    }
    expect(result.route.protocol).toBe('cups-png');
    expect(result.route.codec).toBe('png-rgba');
    expect(result.route.protocol).not.toBe('tspl');
  });

  it('does not invent Canon USB or Bluetooth routes', () => {
    expect(resolveRoute({ modelId: 'canon-inkjet', transport: 'usb' }).kind).toBe('unsupported');
    expect(resolveRoute({ modelId: 'canon-inkjet', transport: 'bluetooth-ble' }).kind).toBe(
      'unsupported',
    );
  });
});
