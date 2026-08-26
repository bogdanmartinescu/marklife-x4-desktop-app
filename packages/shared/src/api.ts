import type { AppSettings, AppSettingsPatch } from './settings.js';
import type {
  PrinterInfo,
  PrintRequest,
  PrintResult,
  SystemDiagnostics,
  TestPrintRequest,
} from './printer.js';

export interface OpenFileResult {
  name: string;
  mimeType: string;
  data: Uint8Array;
}

export interface ThermalBridgeAPI {
  printers: {
    list(): Promise<PrinterInfo[]>;
    refresh(): Promise<PrinterInfo[]>;
    listUsb(): Promise<PrinterInfo[]>;
    listBluetoothSpp(): Promise<PrinterInfo[]>;
    scanBle(durationMs: number): Promise<PrinterInfo[]>;
    openBluetoothPairing(): Promise<void>;
  };
  print: {
    submit(request: PrintRequest): Promise<PrintResult>;
    testPage(request: TestPrintRequest): Promise<PrintResult>;
  };
  settings: {
    get(): Promise<AppSettings>;
    update(patch: AppSettingsPatch): Promise<AppSettings>;
  };
  diagnostics: {
    getSystemInfo(): Promise<SystemDiagnostics>;
    exportBundle(): Promise<string>;
  };
  sources: {
    openFile(): Promise<OpenFileResult | null>;
  };
}
