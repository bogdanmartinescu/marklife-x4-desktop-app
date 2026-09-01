export type PrinterBackend =
  | 'windows-spooler'
  | 'cups'
  | 'tcp'
  | 'usb'
  | 'bluetooth-spp'
  | 'bluetooth-ble';

export type PrinterStatus = 'ready' | 'offline' | 'unknown' | 'error';

export interface PrinterInfo {
  id: string;
  name: string;
  systemName: string;
  isDefault: boolean;
  status: PrinterStatus;
  backend: PrinterBackend;
  tcpHost?: string;
  tcpPort?: number;
  usbVidPid?: string;
  usbInterface?: number;
  serialPort?: string;
  btAddress?: string;
  btServiceUuid?: string;
  rssi?: number;
}

export interface PrintRequest {
  width: number;
  height: number;
  rgba: Uint8Array;
  widthMm: number;
  heightMm: number;
  dpi: number;
  density: number;
  speed: number;
  copies: number;
  mediaMode: 'continuous' | 'gap' | 'black-mark';
  gapHeightMm: number;
  gapOffsetMm: number;
  markHeightMm: number;
  markOffsetMm: number;
  dither: 'threshold' | 'floyd-steinberg';
  threshold: number;
  rotation: 0 | 90 | 180 | 270;
  mirrorX: boolean;
  mirrorY: boolean;
  negative: boolean;
  offsetXmm: number;
  offsetYmm: number;
  fitMode: 'fit' | 'fill' | 'actual' | 'stretch';
  printerId: string;
  jobName: string;
  profileId?: string;
  diagnosticRoute?: 'x4-spp-raw-tspl';
}

export interface TestPrintRequest {
  printerId: string;
  widthMm: number;
  heightMm: number;
  dpi: number;
  density: number;
  speed: number;
  mediaMode: 'continuous' | 'gap' | 'black-mark';
  gapHeightMm: number;
  gapOffsetMm: number;
  profileId?: string;
  diagnosticRoute?: 'x4-spp-raw-tspl';
}

export interface PrintResult {
  ok: boolean;
  jobId: string;
  message: string;
}

export interface SystemDiagnostics {
  appVersion: string;
  electronVersion: string;
  os: string;
  arch: string;
  printbridgeVersion: string | null;
  printbridgePlatform: string | null;
  printers: PrinterInfo[];
  lastPrintResult: PrintResult | null;
}
