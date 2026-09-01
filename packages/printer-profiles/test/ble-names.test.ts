import { describe, expect, it } from 'vitest';
import { advertisedNameMatches, isHostIncomingPort, portNameLooksLikePrinter } from '../src/ble-names.js';

describe('advertisedNameMatches', () => {
  it('matches thermoprint-style name prefixes', () => {
    expect(advertisedNameMatches('P15')).toBe(true);
    expect(advertisedNameMatches('P15R-ABCD')).toBe(true);
    expect(advertisedNameMatches('X4')).toBe(true);
    expect(advertisedNameMatches('Marklife X4')).toBe(true);
    expect(advertisedNameMatches('D210')).toBe(true);
    expect(advertisedNameMatches('M110')).toBe(true);
    expect(advertisedNameMatches('Phomemo M110')).toBe(true);
    expect(advertisedNameMatches('Q002E0CP0670069')).toBe(true);
    expect(advertisedNameMatches('AirPods Pro')).toBe(false);
    expect(advertisedNameMatches('')).toBe(false);
  });
});

describe('portNameLooksLikePrinter', () => {
  it('matches macOS Marklife serial paths without treating the host incoming port as a printer', () => {
    expect(portNameLooksLikePrinter('/dev/cu.Marklife-X4-Serial')).toBe(true);
    expect(portNameLooksLikePrinter('/dev/cu.D210')).toBe(true);
    expect(isHostIncomingPort('/dev/cu.Bluetooth-Incoming-Port')).toBe(true);
    expect(portNameLooksLikePrinter('/dev/cu.Bluetooth-Incoming-Port')).toBe(false);
  });
});
