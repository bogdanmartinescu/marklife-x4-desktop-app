export type ErrorCode =
  | 'NO_PRINTER_SELECTED'
  | 'PRINTER_NOT_FOUND'
  | 'PRINTER_OFFLINE'
  | 'RAW_PRINT_UNSUPPORTED'
  | 'PRINTBRIDGE_START_FAILED'
  | 'PRINTBRIDGE_PROTOCOL_ERROR'
  | 'INVALID_LABEL_SIZE'
  | 'INVALID_BITMAP'
  | 'PDF_RENDER_FAILED'
  | 'FILE_UNSUPPORTED'
  | 'LIBRARY_NOT_FOUND'
  | 'TCP_CONNECTION_FAILED'
  | 'PRINT_WRITE_FAILED'
  | 'USB_DRIVER_CONFLICT'
  | 'BLUETOOTH_SCAN_FAILED'
  | 'BLUETOOTH_PAIRING_FAILED'
  | 'PROTOCOL_UNIMPLEMENTED'
  | 'ROUTE_UNSUPPORTED'
  | 'PARSE_ERROR'
  | 'METHOD_NOT_FOUND'
  | 'UNKNOWN';

export class ThermalBridgeError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ThermalBridgeError';
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

export function isErrorCode(value: unknown): value is ErrorCode {
  return (
    value === 'NO_PRINTER_SELECTED' ||
    value === 'PRINTER_NOT_FOUND' ||
    value === 'PRINTER_OFFLINE' ||
    value === 'RAW_PRINT_UNSUPPORTED' ||
    value === 'PRINTBRIDGE_START_FAILED' ||
    value === 'PRINTBRIDGE_PROTOCOL_ERROR' ||
    value === 'INVALID_LABEL_SIZE' ||
    value === 'INVALID_BITMAP' ||
    value === 'PDF_RENDER_FAILED' ||
    value === 'FILE_UNSUPPORTED' ||
    value === 'LIBRARY_NOT_FOUND' ||
    value === 'TCP_CONNECTION_FAILED' ||
    value === 'PRINT_WRITE_FAILED' ||
    value === 'USB_DRIVER_CONFLICT' ||
    value === 'BLUETOOTH_SCAN_FAILED' ||
    value === 'BLUETOOTH_PAIRING_FAILED' ||
    value === 'PROTOCOL_UNIMPLEMENTED' ||
    value === 'ROUTE_UNSUPPORTED' ||
    value === 'PARSE_ERROR' ||
    value === 'METHOD_NOT_FOUND' ||
    value === 'UNKNOWN'
  );
}
