import { ipcRenderer } from 'electron';
import { IpcChannel } from '@thermalbridge/shared/ipc';
import type {
  AppSettings,
  AppSettingsPatch,
  OpenFileResult,
  AddMediaInput,
  AddPrintHistoryInput,
  LabelTemplate,
  LabelTemplateMeta,
  MediaFileMeta,
  MediaFileResult,
  MenuCommand,
  SaveLabelTemplateInput,
  PrinterInfo,
  PrintHistoryMeta,
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
  library: {
    listMedia: () => ipcRenderer.invoke(IpcChannel.LIBRARY_MEDIA_LIST) as Promise<MediaFileMeta[]>,
    addMedia: (input: AddMediaInput) =>
      ipcRenderer.invoke(IpcChannel.LIBRARY_MEDIA_ADD, input) as Promise<MediaFileMeta>,
    getMedia: (id: string) =>
      ipcRenderer.invoke(IpcChannel.LIBRARY_MEDIA_GET, { id }) as Promise<MediaFileResult>,
    removeMedia: (id: string) =>
      ipcRenderer.invoke(IpcChannel.LIBRARY_MEDIA_REMOVE, { id }) as Promise<void>,
    listHistory: () =>
      ipcRenderer.invoke(IpcChannel.LIBRARY_HISTORY_LIST) as Promise<PrintHistoryMeta[]>,
    addHistory: (input: AddPrintHistoryInput) =>
      ipcRenderer.invoke(IpcChannel.LIBRARY_HISTORY_ADD, input) as Promise<PrintHistoryMeta>,
    getHistoryPng: (id: string) =>
      ipcRenderer.invoke(IpcChannel.LIBRARY_HISTORY_GET, { id }) as Promise<Uint8Array>,
    removeHistory: (id: string) =>
      ipcRenderer.invoke(IpcChannel.LIBRARY_HISTORY_REMOVE, { id }) as Promise<void>,
    listTemplates: () =>
      ipcRenderer.invoke(IpcChannel.LIBRARY_TEMPLATES_LIST) as Promise<LabelTemplateMeta[]>,
    saveTemplate: (input: SaveLabelTemplateInput) =>
      ipcRenderer.invoke(IpcChannel.LIBRARY_TEMPLATES_SAVE, input) as Promise<LabelTemplate>,
    getTemplate: (id: string) =>
      ipcRenderer.invoke(IpcChannel.LIBRARY_TEMPLATES_GET, { id }) as Promise<LabelTemplate>,
    removeTemplate: (id: string) =>
      ipcRenderer.invoke(IpcChannel.LIBRARY_TEMPLATES_REMOVE, { id }) as Promise<void>,
  },
  menu: {
    setState: (state) => ipcRenderer.invoke(IpcChannel.MENU_STATE, state) as Promise<void>,
    onCommand: (handler) => {
      const listener = (_event: unknown, raw: unknown): void => {
        if (typeof raw !== 'object' || raw === null || !('action' in raw)) {
          return;
        }
        handler(raw as MenuCommand);
      };
      ipcRenderer.on(IpcChannel.MENU_COMMAND, listener);
      return () => {
        ipcRenderer.removeListener(IpcChannel.MENU_COMMAND, listener);
      };
    },
  },
};
