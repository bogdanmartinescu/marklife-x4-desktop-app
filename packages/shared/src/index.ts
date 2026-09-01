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
  type AddMediaInput,
  type AddPrintHistoryInput,
  type SaveLabelTemplateInput,
  type MediaFileResult,
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
export {
  MediaFileMetaSchema,
  PrintHistoryMetaSchema,
  LabelTemplateSchema,
  LabelTemplateMetaSchema,
  OverlaySnapshotSchema,
  TemplatePageSchema,
  MEDIA_MIME_TYPES,
  LIBRARY_MAX_ITEMS,
  LIBRARY_MAX_BYTES,
  TEMPLATE_MAX_ITEMS,
  TEMPLATE_MAX_BYTES,
  TEMPLATE_MAX_PAGES,
  isSafeLibraryId,
  isMediaMimeType,
  type MediaFileMeta,
  type MediaMimeType,
  type PrintHistoryMeta,
  type LabelTemplate,
  type LabelTemplateMeta,
  type OverlaySnapshot,
  type TemplatePage,
} from './library.js';
