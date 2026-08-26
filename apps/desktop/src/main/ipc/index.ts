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
  type OpenFileResult,
  type PrinterBackend,
  type PrinterInfo,
  type PrintResult,
  type SystemDiagnostics,
} from '@thermalbridge/shared';
import { type MediaSettings, type RgbaImage } from '@thermalbridge/thermal-core';
import type { Logger } from '../logger.js';
import { jobTempDir, logsPath } from '../paths.js';
import { encodeJobForRoute } from '../printing/encode-job.js';
import { inferTransport } from '../printing/infer-transport.js';
import { writeJobFile } from '../printing/job-writer.js';
import { buildTestPattern } from '../printing/test-pattern.js';
import type { BridgeManager } from '../printing/bridge-manager.js';
import type { SettingsStore } from '../settings/store.js';
import { BleScanSchema, PrintRequestSchema, TestPrintRequestSchema } from './schemas.js';
import { openBluetoothSettings } from '../bluetooth/open-settings.js';

const lastPrint: { current: PrintResult | null } = { current: null };

export function registerIpc(options: {
  bridge: BridgeManager;
  settings: SettingsStore;
  logger: Logger;
  appVersion: string;
}): void {
  const { bridge, settings, logger, appVersion } = options;

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

    const result = await submitJob(bridge, settings, request.printerId, request.jobName, bytes);
    lastPrint.current = result;
    logger.info('print submitted', { jobId: result.jobId, bytes: bytes.length });
    return result;
  });

  ipcMain.handle(IpcChannel.PRINT_TEST, async (_event, raw: unknown): Promise<PrintResult> => {
    const request = TestPrintRequestSchema.parse(raw);
    const image = buildTestPattern(request.widthMm, request.heightMm, request.dpi);
    const media: MediaSettings =
      request.mediaMode === 'continuous'
        ? { mode: 'continuous' }
        : request.mediaMode === 'black-mark'
          ? { mode: 'black-mark', markHeightMm: 3, markOffsetMm: 0 }
          : { mode: 'gap', gapHeightMm: request.gapHeightMm, gapOffsetMm: request.gapOffsetMm };
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
        media,
        dither: 'threshold',
      },
    });
    const result = await submitJob(bridge, settings, request.printerId, 'ThermalBridge test page', bytes);
    lastPrint.current = result;
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
): Promise<PrintResult> {
  const binding = settings.get().bindings.find((item) => item.printerId === printerId);
  const printers = await safeList(bridge, 'printers.list');
  const discovered = printers.find((item) => item.id === printerId);
  if (!binding && !discovered) {
    throw new ThermalBridgeError('NO_PRINTER_SELECTED', 'Select a printer before printing');
  }

  const filePath = writeJobFile(jobTempDir(), bytes);
  const params: Record<string, unknown> = {
    printerId,
    filePath,
    jobName,
    backend: binding?.backend ?? discovered?.backend ?? defaultBackend(),
    systemName: binding?.systemName ?? discovered?.systemName ?? printerId,
  };
  assignOptional(params, 'tcpHost', binding?.tcpHost ?? discovered?.tcpHost);
  assignOptional(params, 'tcpPort', binding?.tcpPort ?? discovered?.tcpPort);
  assignOptional(params, 'usbVidPid', binding?.usbVidPid);
  assignOptional(params, 'usbInterface', binding?.usbInterface);
  assignOptional(params, 'usbOutEndpoint', binding?.usbOutEndpoint);
  assignOptional(params, 'serialPort', binding?.serialPort);
  assignOptional(params, 'btAddress', binding?.btAddress);
  assignOptional(params, 'btServiceUuid', binding?.btServiceUuid);
  assignOptional(params, 'btTxCharUuid', binding?.btTxCharUuid);

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

function routeContext(
  settings: SettingsStore,
  printerId: string,
  profileId?: string,
): { profileId: string; transport: PrinterBackend } {
  const binding = settings.get().bindings.find((item) => item.printerId === printerId);
  return {
    profileId: profileId ?? binding?.profileId ?? 'marklife-x4',
    transport: inferTransport(printerId, binding?.backend),
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
