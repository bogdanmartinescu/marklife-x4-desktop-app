import { describe, expect, it } from 'vitest';
import {
  formatFieldDate,
  formatSerial,
  hasIncrementingFields,
  resolveFieldText,
} from './field-value.js';
import { createFieldOverlay, createTextOverlay } from './overlay.js';

describe('formatFieldDate', () => {
  const date = new Date(2026, 7, 28);

  it('formats ISO, EU, and US dates', () => {
    expect(formatFieldDate(date, 'iso')).toBe('2026-08-28');
    expect(formatFieldDate(date, 'eu')).toBe('28.08.2026');
    expect(formatFieldDate(date, 'us')).toBe('08/28/2026');
  });
});

describe('formatSerial', () => {
  it('pads the starting value on the first copy', () => {
    expect(formatSerial(1, 1, 4, 0)).toBe('0001');
  });

  it('steps by copy index', () => {
    expect(formatSerial(10, 2, 3, 3)).toBe('016');
  });

  it('leaves unpadded counters as decimal digits', () => {
    expect(formatSerial(7, 1, 0, 2)).toBe('9');
  });
});

describe('resolveFieldText', () => {
  it('prefixes a formatted date', () => {
    const overlay = createFieldOverlay(40, 30);
    overlay.fieldKind = 'date';
    overlay.dateFormat = 'eu';
    overlay.text = 'Packed ';
    expect(resolveFieldText(overlay, { now: new Date(2026, 7, 28), copyIndex: 0 })).toBe(
      'Packed 28.08.2026',
    );
  });

  it('resolves serial numbers from the copy index', () => {
    const overlay = createFieldOverlay(40, 30);
    overlay.fieldKind = 'serial';
    overlay.text = 'SN';
    overlay.serialStart = 12;
    overlay.serialStep = 1;
    overlay.serialPad = 4;
    expect(resolveFieldText(overlay, { now: new Date(), copyIndex: 2 })).toBe('SN0014');
  });
});

describe('hasIncrementingFields', () => {
  it('is true when a serial or counter field is present', () => {
    const serial = createFieldOverlay(40, 30);
    serial.fieldKind = 'serial';
    expect(hasIncrementingFields([createTextOverlay(40, 30), serial])).toBe(true);
  });

  it('is false for date-only fields', () => {
    const date = createFieldOverlay(40, 30);
    date.fieldKind = 'date';
    expect(hasIncrementingFields([date])).toBe(false);
  });
});
