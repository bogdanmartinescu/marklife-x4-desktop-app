import type { BarcodeFormat } from './overlay.js';

/** GS1 EAN-13 checksum for a 12-digit body. */
export function ean13Checksum(body12: string): string {
  const sum = [...body12].reduce((acc, char, index) => {
    const digit = Number(char);
    return acc + (index % 2 === 0 ? digit : digit * 3);
  }, 0);
  return String((10 - (sum % 10)) % 10);
}

/** UPC-A checksum for an 11-digit body. */
export function upcChecksum(body11: string): string {
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const digit = Number(body11[i] ?? 0);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  return String((10 - (sum % 10)) % 10);
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function sampleBarcodeValue(format: BarcodeFormat): string {
  switch (format) {
    case 'EAN13':
      return '4006381333931';
    case 'UPC':
      return '012345678905';
    case 'CODE39':
      return 'TEST';
    default:
      return '1234567890';
  }
}

/**
 * Turn editor text into a value JsBarcode will encode.
 * EAN-13 / UPC always get a valid checksum; CODE39 is uppercased.
 */
export function normalizeBarcodeValue(format: BarcodeFormat, content: string): string {
  switch (format) {
    case 'EAN13': {
      let body = digitsOnly(content);
      if (body.length === 13) {
        body = body.slice(0, 12);
      }
      if (body.length === 0) {
        body = sampleBarcodeValue('EAN13').slice(0, 12);
      }
      if (body.length < 12) {
        body = body.padStart(12, '0');
      }
      if (body.length > 12) {
        body = body.slice(0, 12);
      }
      return `${body}${ean13Checksum(body)}`;
    }
    case 'UPC': {
      let body = digitsOnly(content);
      if (body.length === 12) {
        body = body.slice(0, 11);
      }
      if (body.length === 0) {
        body = sampleBarcodeValue('UPC').slice(0, 11);
      }
      if (body.length < 11) {
        body = body.padStart(11, '0');
      }
      if (body.length > 11) {
        body = body.slice(0, 11);
      }
      return `${body}${upcChecksum(body)}`;
    }
    case 'CODE39': {
      const cleaned = content.toUpperCase().replace(/[^0-9A-Z\-. $/+%]/g, '').trim();
      return cleaned.length > 0 ? cleaned : sampleBarcodeValue('CODE39');
    }
    default:
      return content.trim() || sampleBarcodeValue('CODE128');
  }
}

/** EAN-13 / UPC-A bar modules, plus the side-digit gutters JsBarcode adds. */
export function eanFamilyModuleCount(
  format: Extract<BarcodeFormat, 'EAN13' | 'UPC'>,
  displayValue: boolean,
): number {
  const bars = 95;
  if (!displayValue) {
    return bars;
  }
  return format === 'EAN13' ? bars + 12 : bars + 16;
}
