export {
  ThermalBridgeError,
  isErrorCode,
  type ErrorCode,
} from './errors.js';
export {
  IpcChannel,
  type IpcChannelName,
} from './ipc.js';
export {
  type PrinterBackend,
  type PrinterStatus,
  type PrinterInfo,
  type PrintRequest,
  type TestPrintRequest,
  type PrintResult,
  type SystemDiagnostics,
} from './printer.js';
export {
  type ThermalBridgeAPI,
  type OpenFileResult,
} from './api.js';
export {
  PrinterBindingSchema,
  LabelSizeSchema,
  AppSettingsSchema,
  AppSettingsPatchSchema,
  DEFAULT_APP_SETTINGS,
  SETTINGS_SCHEMA_VERSION,
  type PrinterBinding,
  type AppSettings,
  type AppSettingsPatch,
} from './settings.js';
