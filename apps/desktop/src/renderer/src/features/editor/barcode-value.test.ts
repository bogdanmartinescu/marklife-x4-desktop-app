import { describe, expect, it } from 'vitest';
import {
  ean13Checksum,
  eanFamilyModuleCount,
  normalizeBarcodeValue,
  sampleBarcodeValue,
  upcChecksum,
} from './barcode-value.js';

describe('EAN-13 and UPC checksums', () => {
  it('computes the Wikipedia EAN-13 check digit', () => {
    expect(ean13Checksum('400638133393')).toBe('1');
    expect(normalizeBarcodeValue('EAN13', '400638133393')).toBe('4006381333931');
    expect(normalizeBarcodeValue('EAN13', '4006381333930')).toBe('4006381333931');
  });

  it('pads short numeric input and still produces a valid EAN-13', () => {
    const value = normalizeBarcodeValue('EAN13', '1234567890');
    expect(value).toMatch(/^[0-9]{13}$/);
    expect(value.slice(-1)).toBe(ean13Checksum(value.slice(0, 12)));
  });

  it('computes a UPC-A check digit', () => {
    expect(upcChecksum('01234567890')).toBe('5');
    expect(normalizeBarcodeValue('UPC', '01234567890')).toBe('012345678905');
  });
});

describe('barcode samples and CODE39', () => {
  it('uppercases CODE39 and strips illegal characters', () => {
    expect(normalizeBarcodeValue('CODE39', 'ab-12!')).toBe('AB-12');
    expect(normalizeBarcodeValue('CODE39', '***')).toBe(sampleBarcodeValue('CODE39'));
  });

  it('counts EAN-13 modules including the first-digit gutter', () => {
    expect(eanFamilyModuleCount('EAN13', false)).toBe(95);
    expect(eanFamilyModuleCount('EAN13', true)).toBe(107);
    expect(eanFamilyModuleCount('UPC', true)).toBe(111);
  });
});
