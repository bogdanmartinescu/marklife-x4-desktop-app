import type { MenuCommand, MenuState } from './menu-schemas.js';

export interface SyncStatus {
  /** Absolute path to the active shared folder, or null when sync is disabled. */
  folderPath: string | null;
  /** Suggested Dropbox folder path detected on this machine, or null if not found. */
  dropboxSuggested: string | null;
  /** True if Dropbox conflict copies of media.json or templates.json are present. */
  conflicted: boolean;
}
import type { AppSettings, AppSettingsPatch } from './settings.js';
import type { LabelTemplate, LabelTemplateMeta, MediaFileMeta, PrintHistoryMeta, TemplatePage } from './library.js';
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

export interface AddMediaInput {
  name: string;
  mimeType: string;
  data: Uint8Array;
}

export interface MediaFileResult {
  meta: MediaFileMeta;
  data: Uint8Array;
}

export type AddPrintHistoryInput = Omit<PrintHistoryMeta, 'id' | 'printedAt'> & {
  png: Uint8Array;
};

export interface SaveLabelTemplateInput {
  id?: string | undefined;
  name: string;
  widthMm: number;
  heightMm: number;
  pages: TemplatePage[];
}

export interface ThermalBridgeAPI {
  sync: {
    getStatus(): Promise<SyncStatus>;
    chooseFolder(): Promise<SyncStatus>;
    disconnect(): Promise<SyncStatus>;
    openFolder(folderPath: string): void;
    onLibraryChanged(handler: () => void): () => void;
  };
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
  library: {
    listMedia(): Promise<MediaFileMeta[]>;
    addMedia(input: AddMediaInput): Promise<MediaFileMeta>;
    getMedia(id: string): Promise<MediaFileResult>;
    removeMedia(id: string): Promise<void>;
    listHistory(): Promise<PrintHistoryMeta[]>;
    addHistory(input: AddPrintHistoryInput): Promise<PrintHistoryMeta>;
    getHistoryPng(id: string): Promise<Uint8Array>;
    removeHistory(id: string): Promise<void>;
    listTemplates(): Promise<LabelTemplateMeta[]>;
    saveTemplate(input: SaveLabelTemplateInput): Promise<LabelTemplate>;
    getTemplate(id: string): Promise<LabelTemplate>;
    removeTemplate(id: string): Promise<void>;
  };
  menu: {
    setState(state: MenuState): Promise<void>;
    onCommand(handler: (command: MenuCommand) => void): () => void;
  };
}
