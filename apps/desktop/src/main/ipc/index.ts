import { dialog, ipcMain, BrowserWindow } from 'electron';
import { randomUUID } from 'node:crypto';
import { unlinkSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import type { z } from 'zod';
import {
  AppSettingsPatchSchema,
  IpcChannel,
  ThermalBridgeError,
  type AppSettings,
  type LabelTemplate,
  type LabelTemplateMeta,
  type MediaFileMeta,
  type MediaFileResult,
  type OpenFileResult,
  type PrinterBackend,
  type PrinterInfo,
  type PrintHistoryMeta,
  type PrintResult,
  type SystemDiagnostics,
} from '@thermalbridge/shared';
import {
  MARKLIFE_X4,
  resolveRoute,
  selectPrintableProfile,
  x4BleWriteTarget,
  type TransportKind,
} from '@thermalbridge/printer-profiles';
import { DEFAULT_BITMAP_ENCODING, type MediaSettings, type RgbaImage } from '@thermalbridge/thermal-core';
import type { Logger } from '../logger.js';
import { jobTempDir, logsPath } from '../paths.js';
import { LibraryStore } from '../library/store.js';
import { encodeJobForRoute } from '../printing/encode-job.js';
import { inferTransport } from '../printing/infer-transport.js';
import { cupsMediaName } from '../printing/cups-media.js';
import { writeJobFile } from '../printing/job-writer.js';
import { prepareTestPageImage } from '../printing/sample-awb.js';
import type { BridgeManager } from '../printing/bridge-manager.js';
import type { SettingsStore } from '../settings/store.js';
import { AddHistorySchema, AddMediaSchema, BleScanSchema, LibraryIdSchema, PrintRequestSchema, SaveTemplateSchema, TestPrintRequestSchema } from './schemas.js';
import { openBluetoothSettings } from '../bluetooth/open-settings.js';

const lastPrint: { current: PrintResult | null } = { current: null };

export function registerIpc(options: {
  bridge: BridgeManager;
  settings: SettingsStore;
  library: LibraryStore;
  logger: Logger;
  appVersion: string;
}): void {
  const { bridge, settings, library, logger, appVersion } = options;

  ipcMain.handle(IpcChannel.PRINTERS_LIST, async (): Promise<PrinterInfo[]> => {
    return await listPrinters(bridge, settings);
  });

  ipcMain.handle(IpcChannel.PRINTERS_REFRESH, async (): Promise<PrinterInfo[]> => {
    return await listPrinters(bridge, settings);
  });

  ipcMain.handle(IpcChannel.USB_LIST, async (): Promise<PrinterInfo[]> => {
    return await safeList(bridge, 'printers.listUsb');
  });

  ipcMain.handle(IpcChannel.BLUETOOTH_SPP_LIST, async (): Promise<PrinterInfo[]> => {
    return await safeList(bridge, 'printers.listBluetoothSpp');
  });

  ipcMain.handle(IpcChannel.BLUETOOTH_SCAN, async (_event, raw: unknown): Promise<PrinterInfo[]> => {
    const parsed = BleScanSchema.parse(raw);
    try {
      const result = await bridge.request<PrinterInfo[]>('printers.scanBle', {
        durationMs: parsed.durationMs,
      });
      return Array.isArray(result) ? result : [];
    } catch (error) {
      logger.warn('BLE scan failed', { error: error instanceof Error ? error.message : String(error) });
      throw toBridgeError(error, 'BLUETOOTH_SCAN_FAILED');
    }
  });

  ipcMain.handle(IpcChannel.BLUETOOTH_OPEN_PAIRING, async (): Promise<void> => {
    try {
      await openBluetoothSettings();
    } catch (error) {
      logger.warn('Bluetooth pairing UI failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw toBridgeError(error, 'BLUETOOTH_PAIRING_FAILED');
    }
  });

  ipcMain.handle(IpcChannel.SETTINGS_GET, (): AppSettings => settings.get());

  ipcMain.handle(IpcChannel.SETTINGS_UPDATE, (_event, raw: unknown): AppSettings => {
    const patch = AppSettingsPatchSchema.parse(raw);
    return settings.update(patch);
  });

  ipcMain.handle(IpcChannel.PRINT_SUBMIT, async (_event, raw: unknown): Promise<PrintResult> => {
    const request = PrintRequestSchema.parse(raw);
    const image: RgbaImage = {
      width: request.width,
      height: request.height,
      data: new Uint8ClampedArray(request.rgba),
    };
    if (image.data.length !== request.width * request.height * 4) {
      throw new ThermalBridgeError('INVALID_BITMAP', 'RGBA buffer length does not match dimensions');
    }

    const media = mediaFromRequest(request);
    const route = routeContext(settings, request.printerId, request.profileId);
    const bytes = await encodeJobForRoute({
      profileId: route.profileId,
      transport: route.transport,
      ...(request.diagnosticRoute !== undefined
        ? { diagnosticRoute: request.diagnosticRoute }
        : {}),
      image,
      tspl: {
        image,
        widthMm: request.widthMm,
        heightMm: request.heightMm,
        dpi: request.dpi,
        density: request.density,
        speed: request.speed,
        copies: request.copies,
        media,
        dither: request.dither,
        threshold: request.threshold,
        transform: {
          rotation: request.rotation,
          mirrorX: request.mirrorX,
          mirrorY: request.mirrorY,
          negative: request.negative,
          offsetXmm: request.offsetXmm,
          offsetYmm: request.offsetYmm,
          fitMode: request.fitMode,
        },
      },
    });

    const extras = {
      ...bleWriteExtras(route),
      ...documentJobExtras(route, request.widthMm, request.heightMm),
    };
    const copies = route.profileId === 'phomemo-m110' ? request.copies : 1;
    let result: PrintResult | undefined;
    for (let index = 0; index < copies; index += 1) {
      result = await submitJob(bridge, settings, request.printerId, request.jobName, bytes, extras);
    }
    if (!result) {
      throw new ThermalBridgeError('PRINT_WRITE_FAILED', 'Print produced no result');
    }
    lastPrint.current = result;
    logger.info('print submitted', {
      jobId: result.jobId,
      bytes: bytes.length,
      profileId: route.profileId,
      transport: route.transport,
      bitmapBlackBit: DEFAULT_BITMAP_ENCODING.blackBit,
      tsplMode: DEFAULT_BITMAP_ENCODING.tsplMode,
      rgbaInverted: route.profileId === MARKLIFE_X4.id,
    });
    return result;
  });

  ipcMain.handle(IpcChannel.PRINT_TEST, async (_event, raw: unknown): Promise<PrintResult> => {
    const request = TestPrintRequestSchema.parse(raw);
    const route = routeContext(settings, request.printerId, request.profileId);
    const image = prepareTestPageImage(
      route.profileId,
      request.widthMm,
      request.heightMm,
      request.dpi,
    );
    const media: MediaSettings =
      request.mediaMode === 'continuous'
        ? { mode: 'continuous' }
        : request.mediaMode === 'black-mark'
          ? { mode: 'black-mark', markHeightMm: 3, markOffsetMm: 0 }
          : { mode: 'gap', gapHeightMm: request.gapHeightMm, gapOffsetMm: request.gapOffsetMm };
    const bytes = await encodeJobForRoute({
      profileId: route.profileId,
      transport: route.transport,
      ...(request.diagnosticRoute !== undefined
        ? { diagnosticRoute: request.diagnosticRoute }
        : {}),
      image,
      tspl: {
        image,
        widthMm: request.widthMm,
        heightMm: request.heightMm,
        dpi: request.dpi,
        density: request.density,
        speed: request.speed,
        media,
        dither: 'threshold',
      },
    });
    const result = await submitJob(
      bridge,
      settings,
      request.printerId,
      'ThermalBridge sample AWB',
      bytes,
      {
        ...bleWriteExtras(route),
        ...documentJobExtras(route, request.widthMm, request.heightMm),
      },
    );
    lastPrint.current = result;
    logger.info('test page submitted', {
      jobId: result.jobId,
      bytes: bytes.length,
      profileId: route.profileId,
      transport: route.transport,
      rgbaInverted: route.profileId === MARKLIFE_X4.id,
    });
    return result;
  });

  ipcMain.handle(IpcChannel.DIAGNOSTICS_SYSTEM, async (): Promise<SystemDiagnostics> => {
    let version: { version?: string; platform?: string } = {};
    try {
      version = await bridge.request('diagnostics.system', {});
    } catch {
      version = {};
    }
    return {
      appVersion,
      electronVersion: process.versions.electron ?? 'unknown',
      os: process.platform,
      arch: process.arch,
      printbridgeVersion: version.version ?? null,
      printbridgePlatform: version.platform ?? null,
      printers: await listPrinters(bridge, settings),
      lastPrintResult: lastPrint.current,
    };
  });

  ipcMain.handle(IpcChannel.DIAGNOSTICS_EXPORT, async (): Promise<string> => {
    const chosen = await dialog.showSaveDialog({
      title: 'Export diagnostics bundle',
      defaultPath: 'thermalbridge-diagnostics.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (chosen.canceled || !chosen.filePath) {
      throw new ThermalBridgeError('UNKNOWN', 'Diagnostics export was cancelled');
    }
    let log = '';
    try {
      log = await readFile(logsPath(), 'utf8');
    } catch {
      log = '';
    }
    const bundle = {
      exportedAt: new Date().toISOString(),
      settings: settings.get(),
      logsTail: log.split('\n').slice(-400),
    };
    writeFileSync(chosen.filePath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
    return chosen.filePath;
  });

  ipcMain.handle(IpcChannel.SOURCES_OPEN, async (event): Promise<OpenFileResult | null> => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const dialogOptions = {
      title: 'Open label',
      properties: ['openFile'] as Array<'openFile'>,
      filters: [
        { name: 'Labels', extensions: ['png', 'jpg', 'jpeg', 'pdf'] },
        { name: 'All files', extensions: ['*'] },
      ],
    };
    const chosen = window
      ? await dialog.showOpenDialog(window, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);
    const filePath = chosen.filePaths[0];
    if (chosen.canceled || !filePath) {
      return null;
    }
    const ext = extname(filePath).toLowerCase();
    const mimeType =
      ext === '.pdf'
        ? 'application/pdf'
        : ext === '.png'
          ? 'image/png'
          : ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : '';
    if (!mimeType) {
      throw new ThermalBridgeError('FILE_UNSUPPORTED', `Unsupported file type: ${ext}`);
    }
    const data = new Uint8Array(await readFile(filePath));
    return { name: filePath.split(/[\\/]/).pop() ?? 'label', mimeType, data };
  });

  ipcMain.handle(IpcChannel.LIBRARY_MEDIA_LIST, (): MediaFileMeta[] => library.listMedia());

  ipcMain.handle(IpcChannel.LIBRARY_MEDIA_ADD, (_event, raw: unknown): MediaFileMeta => {
    const parsed = AddMediaSchema.parse(raw);
    return library.addMedia(parsed.name, parsed.mimeType, parsed.data);
  });

  ipcMain.handle(IpcChannel.LIBRARY_MEDIA_GET, (_event, raw: unknown): MediaFileResult => {
    const parsed = LibraryIdSchema.parse(raw);
    return library.getMedia(parsed.id);
  });

  ipcMain.handle(IpcChannel.LIBRARY_MEDIA_REMOVE, (_event, raw: unknown): void => {
    const parsed = LibraryIdSchema.parse(raw);
    library.removeMedia(parsed.id);
  });

  ipcMain.handle(IpcChannel.LIBRARY_HISTORY_LIST, (): PrintHistoryMeta[] => library.listHistory());

  ipcMain.handle(IpcChannel.LIBRARY_HISTORY_ADD, (_event, raw: unknown): PrintHistoryMeta => {
    const parsed = AddHistorySchema.parse(raw);
    return library.addHistory(parsed);
  });

  ipcMain.handle(IpcChannel.LIBRARY_HISTORY_GET, (_event, raw: unknown): Uint8Array => {
    const parsed = LibraryIdSchema.parse(raw);
    return library.getHistoryPng(parsed.id);
  });

  ipcMain.handle(IpcChannel.LIBRARY_HISTORY_REMOVE, (_event, raw: unknown): void => {
    const parsed = LibraryIdSchema.parse(raw);
    library.removeHistory(parsed.id);
  });

  ipcMain.handle(IpcChannel.LIBRARY_TEMPLATES_LIST, (): LabelTemplateMeta[] => library.listTemplates());

  ipcMain.handle(IpcChannel.LIBRARY_TEMPLATES_SAVE, (_event, raw: unknown): LabelTemplate => {
    return library.saveTemplate(SaveTemplateSchema.parse(raw));
  });

  ipcMain.handle(IpcChannel.LIBRARY_TEMPLATES_GET, (_event, raw: unknown): LabelTemplate => {
    const parsed = LibraryIdSchema.parse(raw);
    return library.getTemplate(parsed.id);
  });

  ipcMain.handle(IpcChannel.LIBRARY_TEMPLATES_REMOVE, (_event, raw: unknown): void => {
    const parsed = LibraryIdSchema.parse(raw);
    library.removeTemplate(parsed.id);
  });
}

async function listPrinters(bridge: BridgeManager, settings: SettingsStore): Promise<PrinterInfo[]> {
  const [osPrinters, usbPrinters, sppPrinters] = await Promise.all([
    safeList(bridge, 'printers.list'),
    safeList(bridge, 'printers.listUsb'),
    safeList(bridge, 'printers.listBluetoothSpp'),
  ]);
  const live = [...osPrinters, ...usbPrinters, ...sppPrinters];
  const liveIds = new Set(live.map((item) => item.id));
  const extras: PrinterInfo[] = [];

  for (const binding of settings.get().bindings) {
    if (liveIds.has(binding.printerId)) {
      continue;
    }
    extras.push({
      id: binding.printerId,
      name: binding.displayName,
      systemName: binding.systemName,
      isDefault: false,
      status: binding.backend === 'tcp' ? 'unknown' : 'offline',
      backend: binding.backend,
      ...(binding.tcpHost !== undefined ? { tcpHost: binding.tcpHost } : {}),
      ...(binding.tcpPort !== undefined ? { tcpPort: binding.tcpPort } : {}),
      ...(binding.usbVidPid !== undefined ? { usbVidPid: binding.usbVidPid } : {}),
      ...(binding.usbInterface !== undefined ? { usbInterface: binding.usbInterface } : {}),
      ...(binding.serialPort !== undefined ? { serialPort: binding.serialPort } : {}),
      ...(binding.btAddress !== undefined ? { btAddress: binding.btAddress } : {}),
      ...(binding.btServiceUuid !== undefined ? { btServiceUuid: binding.btServiceUuid } : {}),
    });
  }

  return [...live, ...extras];
}

async function safeList(bridge: BridgeManager, method: string): Promise<PrinterInfo[]> {
  try {
    const result = await bridge.request<PrinterInfo[]>(method, {});
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

async function submitJob(
  bridge: BridgeManager,
  settings: SettingsStore,
  printerId: string,
  jobName: string,
  bytes: Uint8Array,
  extras: {
    btWriteMode?: string;
    btServiceUuid?: string;
    btTxCharUuid?: string;
    jobExtension?: string;
    rawJob?: boolean;
    cupsMedia?: string;
  } = {},
): Promise<PrintResult> {
  const binding = settings.get().bindings.find((item) => item.printerId === printerId);
  const printers = await safeList(bridge, 'printers.list');
  const discovered = printers.find((item) => item.id === printerId);
  if (!binding && !discovered) {
    throw new ThermalBridgeError('NO_PRINTER_SELECTED', 'Select a printer before printing');
  }

  const filePath = writeJobFile(jobTempDir(), bytes, extras.jobExtension ?? 'prn');
  const params: Record<string, unknown> = {
    printerId,
    filePath,
    jobName,
    backend: binding?.backend ?? discovered?.backend ?? defaultBackend(),
    systemName: binding?.systemName ?? discovered?.systemName ?? printerId,
    rawJob: extras.rawJob ?? true,
  };
  assignOptional(params, 'tcpHost', binding?.tcpHost ?? discovered?.tcpHost);
  assignOptional(params, 'tcpPort', binding?.tcpPort ?? discovered?.tcpPort);
  assignOptional(params, 'usbVidPid', binding?.usbVidPid);
  assignOptional(params, 'usbInterface', binding?.usbInterface);
  assignOptional(params, 'usbOutEndpoint', binding?.usbOutEndpoint);
  assignOptional(params, 'serialPort', binding?.serialPort);
  assignOptional(params, 'btAddress', binding?.btAddress);
  assignOptional(params, 'btServiceUuid', extras.btServiceUuid ?? binding?.btServiceUuid);
  assignOptional(params, 'btTxCharUuid', extras.btTxCharUuid ?? binding?.btTxCharUuid);
  assignOptional(params, 'btWriteMode', extras.btWriteMode);
  assignOptional(params, 'cupsMedia', extras.cupsMedia);
  assignOptional(
    params,
    'btLocalName',
    binding?.displayName ?? discovered?.name,
  );

  try {
    await bridge.request('printer.printRawFile', params);
    return { ok: true, jobId: randomUUID(), message: 'Job submitted' };
  } catch (error) {
    throw toBridgeError(error, 'PRINT_WRITE_FAILED');
  } finally {
    try {
      unlinkSync(filePath);
    } catch {
      // Temp cleanup is best-effort.
    }
  }
}

function mediaFromRequest(request: z.infer<typeof PrintRequestSchema>): MediaSettings {
  switch (request.mediaMode) {
    case 'continuous':
      return { mode: 'continuous' };
    case 'gap':
      return { mode: 'gap', gapHeightMm: request.gapHeightMm, gapOffsetMm: request.gapOffsetMm };
    case 'black-mark':
      return {
        mode: 'black-mark',
        markHeightMm: request.markHeightMm,
        markOffsetMm: request.markOffsetMm,
      };
  }
}

function documentJobExtras(
  route: { profileId: string; transport: PrinterBackend },
  widthMm: number,
  heightMm: number,
): { jobExtension: string; rawJob: boolean; cupsMedia: string } | Record<string, never> {
  const resolved = resolveRoute({
    modelId: route.profileId,
    transport: route.transport as TransportKind,
  });
  if (resolved.kind !== 'resolved' || resolved.route.protocol !== 'cups-png') {
    return {};
  }
  return {
    jobExtension: 'png',
    rawJob: false,
    cupsMedia: cupsMediaName(widthMm, heightMm),
  };
}

function bleWriteExtras(route: { profileId: string; transport: PrinterBackend }): {
  btWriteMode?: string;
  btServiceUuid?: string;
  btTxCharUuid?: string;
} {
  if (route.profileId === 'phomemo-m110' && route.transport === 'bluetooth-ble') {
    return { btWriteMode: 'phomemo-m110' };
  }
  if (route.profileId === MARKLIFE_X4.id && route.transport === 'bluetooth-ble') {
    return x4BleWriteTarget();
  }
  return {};
}

function routeContext(
  settings: SettingsStore,
  printerId: string,
  profileId?: string,
): { profileId: string; transport: PrinterBackend } {
  const binding = settings.get().bindings.find((item) => item.printerId === printerId);
  const transport = inferTransport(printerId, binding?.backend);
  return {
    profileId: selectPrintableProfile({
      transport: transport as TransportKind,
      ...(profileId !== undefined ? { requestedModelId: profileId } : {}),
      ...(binding !== undefined
        ? { boundModelId: binding.profileId, deviceName: binding.displayName }
        : {}),
    }),
    transport,
  };
}

function defaultBackend(): PrinterBackend {
  return process.platform === 'win32' ? 'windows-spooler' : 'cups';
}

function assignOptional(
  target: Record<string, unknown>,
  key: string,
  value: string | number | undefined,
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

function toBridgeError(error: unknown, fallback: ThermalBridgeError['code']): ThermalBridgeError {
  if (error instanceof ThermalBridgeError) {
    return error;
  }
  return new ThermalBridgeError(fallback, error instanceof Error ? error.message : String(error));
}
