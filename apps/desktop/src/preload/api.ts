import { ipcRenderer } from 'electron';
import { IpcChannel } from '@thermalbridge/shared/ipc';
import type {
  AppSettings,
  AppSettingsPatch,
  OpenFileResult,
  PrinterInfo,
  PrintRequest,
  PrintResult,
  SystemDiagnostics,
  TestPrintRequest,
  ThermalBridgeAPI,
} from '@thermalbridge/shared';

export const thermalBridgeApi: ThermalBridgeAPI = {
  printers: {
    list: () => ipcRenderer.invoke(IpcChannel.PRINTERS_LIST) as Promise<PrinterInfo[]>,
    refresh: () => ipcRenderer.invoke(IpcChannel.PRINTERS_REFRESH) as Promise<PrinterInfo[]>,
    listUsb: () => ipcRenderer.invoke(IpcChannel.USB_LIST) as Promise<PrinterInfo[]>,
    listBluetoothSpp: () =>
      ipcRenderer.invoke(IpcChannel.BLUETOOTH_SPP_LIST) as Promise<PrinterInfo[]>,
    scanBle: (durationMs: number) =>
      ipcRenderer.invoke(IpcChannel.BLUETOOTH_SCAN, { durationMs }) as Promise<PrinterInfo[]>,
    openBluetoothPairing: () =>
      ipcRenderer.invoke(IpcChannel.BLUETOOTH_OPEN_PAIRING) as Promise<void>,
  },
  print: {
    submit: (request: PrintRequest) =>
      ipcRenderer.invoke(IpcChannel.PRINT_SUBMIT, request) as Promise<PrintResult>,
    testPage: (request: TestPrintRequest) =>
      ipcRenderer.invoke(IpcChannel.PRINT_TEST, request) as Promise<PrintResult>,
  },
  settings: {
    get: () => ipcRenderer.invoke(IpcChannel.SETTINGS_GET) as Promise<AppSettings>,
    update: (patch: AppSettingsPatch) =>
      ipcRenderer.invoke(IpcChannel.SETTINGS_UPDATE, patch) as Promise<AppSettings>,
  },
  diagnostics: {
    getSystemInfo: () =>
      ipcRenderer.invoke(IpcChannel.DIAGNOSTICS_SYSTEM) as Promise<SystemDiagnostics>,
    exportBundle: () => ipcRenderer.invoke(IpcChannel.DIAGNOSTICS_EXPORT) as Promise<string>,
  },
  sources: {
    openFile: () => ipcRenderer.invoke(IpcChannel.SOURCES_OPEN) as Promise<OpenFileResult | null>,
  },
};
