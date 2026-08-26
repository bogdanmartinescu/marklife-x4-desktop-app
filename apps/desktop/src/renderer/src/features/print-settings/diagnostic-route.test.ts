import { describe, expect, it } from 'vitest';
import { diagnosticRouteFromDraft } from './diagnostic-route.js';

describe('diagnosticRouteFromDraft', () => {
  it('does not attach a TSPL diagnostic route by default', () => {
    expect(
      diagnosticRouteFromDraft({
        profileId: 'marklife-x4',
        backend: 'bluetooth-spp',
        diagnosticTsplOverSpp: false,
      }),
    ).toBeUndefined();
  });

  it('attaches X4 + SPP + raw TSPL only when the diagnostic option is on', () => {
    expect(
      diagnosticRouteFromDraft({
        profileId: 'marklife-x4',
        backend: 'bluetooth-spp',
        diagnosticTsplOverSpp: true,
      }),
    ).toBe('x4-spp-raw-tspl');
  });

  it('does not attach the diagnostic TSPL route for USB or BLE', () => {
    expect(
      diagnosticRouteFromDraft({
        profileId: 'marklife-x4',
        backend: 'usb',
        diagnosticTsplOverSpp: true,
      }),
    ).toBeUndefined();
    expect(
      diagnosticRouteFromDraft({
        profileId: 'marklife-x4',
        backend: 'bluetooth-ble',
        diagnosticTsplOverSpp: true,
      }),
    ).toBeUndefined();
  });
});
