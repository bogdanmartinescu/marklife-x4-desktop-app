import { describe, expect, it } from 'vitest';
import { dotsToMm, mmToDots } from '../../src/geometry/units.js';

describe('mmToDots', () => {
  it('converts 100 mm at 203 DPI to 799 dots', () => {
    expect(mmToDots(100, 203)).toBe(799);
  });

  it('converts 150 mm at 203 DPI to 1199 dots', () => {
    expect(mmToDots(150, 203)).toBe(1199);
  });

  it('converts 25.4 mm (1 inch) at 203 DPI to 203 dots', () => {
    expect(mmToDots(25.4, 203)).toBe(203);
  });

  it('converts 4 inches (101.6 mm) at 203 DPI to 812 dots', () => {
    expect(mmToDots(101.6, 203)).toBe(812);
  });
});

describe('dotsToMm', () => {
  it('round-trips 100 mm at 203 DPI within 0.05 mm', () => {
    const dots = mmToDots(100, 203);
    expect(dotsToMm(dots, 203)).toBeCloseTo(100, 1);
  });

  it('round-trips 25.4 mm exactly to 1 inch', () => {
    expect(dotsToMm(mmToDots(25.4, 203), 203)).toBeCloseTo(25.4, 5);
  });
});
