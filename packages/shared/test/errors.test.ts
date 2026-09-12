import { describe, expect, it } from 'vitest';
import { isErrorCode, ThermalBridgeError } from '../src/errors.js';

describe('ThermalBridgeError', () => {
  it('stores code and optional details', () => {
    const error = new ThermalBridgeError('PARSE_ERROR', 'bad json', { line: 1 });
    expect(error.name).toBe('ThermalBridgeError');
    expect(error.code).toBe('PARSE_ERROR');
    expect(error.message).toBe('bad json');
    expect(error.details).toEqual({ line: 1 });
  });
});

describe('isErrorCode', () => {
  it('accepts known codes and rejects other strings', () => {
    expect(isErrorCode('NO_PRINTER_SELECTED')).toBe(true);
    expect(isErrorCode('UNKNOWN')).toBe(true);
    expect(isErrorCode('not-a-code')).toBe(false);
    expect(isErrorCode(1)).toBe(false);
  });
});
