import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MARKLIFE_X4, PROFILES, labelSizeRecord } from '@thermalbridge/printer-profiles';
import type { AppSettings, PrinterBinding, PrinterInfo, PrintRequest } from '@thermalbridge/shared';
import { ThermalBridgeError } from '@thermalbridge/shared';
import {
  Activity,
  Languages,
  Printer,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.js';
import { Toaster } from '@/components/ui/sonner.js';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.js';
import { CalibrationPane } from '@/features/calibration/CalibrationPane.js';
import { DiagnosticsPane } from '@/features/diagnostics/DiagnosticsPane.js';
import { PreviewPane } from '@/features/preview/PreviewPane.js';
import { pdfPageCount } from '@/features/preview/pdf.js';
import { copyToUint8Array, resolveSourceMime } from '@/features/import/source-bytes.js';
import { boxFromFit } from '@/features/preview/content-placement.js';
import {
  canvasToPngBlob,
  renderLabelCanvas,
  renderSourceBitmap,
  rotateSource,
} from '@/features/preview/render-label.js';
import { intrinsicSize } from '@/features/preview/source-size.js';
import { createBlankLabelCanvas, drawOverlays } from '@/features/editor/rasterize.js';
import {
  centerOverlay,
  centerOverlayH,
  centerOverlayV,
  createBarcodeOverlay,
  createImageOverlay,
  createLineOverlay,
  createQrOverlay,
  createRectOverlay,
  createTextOverlay,
  duplicateOverlay,
  moveOverlayZ,
  type OverlayElement,
} from '@/features/editor/overlay.js';
import {
  createBlankLabelPage,
  duplicateLabelPage,
  insertLabelPageAfter,
  removeLabelPage,
  updateLabelPage,
  type LabelPage,
} from '@/features/editor/label-pages.js';
import { AWB_IMAGE_ID } from '@/features/editor/LabelCanvas.js';
import { PrintPane } from '@/features/print-settings/PrintPane.js';
import { diagnosticRouteFromDraft } from '@/features/print-settings/diagnostic-route.js';
import { ConnectPrinterDialog } from '@/features/printers/ConnectPrinterDialog.js';
import {
  mergePrinterCatalog,
  resolveLinkState,
} from '@/features/printers/connection-status.js';
import { PrinterSetup } from '@/features/printers/PrinterSetup.js';
import {
  BLE_MANUAL_SCAN_MS,
  BLE_POLL_INTERVAL_MS,
  BLE_POLL_SCAN_MS,
  BLE_SETUP_SCAN_MS,
} from '@/features/printers/ble-scan.js';
import {
  devicesFromSightings,
  rememberBleSightings,
  type BleSighting,
} from '@/features/printers/ble-sightings.js';
import { I18nProvider, useI18n } from '@/i18n/I18nProvider.js';
import type { Locale } from '@/i18n/messages.js';
import { applySettingsToDraft } from '@/state/hydrate-draft.js';
import type { PrintDraft, Screen, SourceDocument } from '@/state/types.js';
import { cn } from '@/lib/utils.js';

const INITIAL_DRAFT: PrintDraft = {
  printerId: '',
  profileId: MARKLIFE_X4.id,
  widthMm: 100,
  heightMm: 150,
  mediaMode: 'gap',
  gapHeightMm: 2,
  gapOffsetMm: 0,
  markHeightMm: 3,
  markOffsetMm: 0,
  density: MARKLIFE_X4.density.default,
  speed: MARKLIFE_X4.speed.default,
  copies: 1,
  dither: 'threshold',
  threshold: 128,
  rotation: 0,
  fitMode: 'fit',
  mirrorX: false,
  mirrorY: false,
  negative: false,
  offsetXmm: 0,
  offsetYmm: 0,
  diagnosticTsplOverSpp: false,
};

export function App() {
  const [locale, setLocaleState] = useState<Locale>('ro');
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const setLocale = (next: Locale): void => {
    setLocaleState(next);
    document.documentElement.lang = next;
    if (window.thermalBridge) {
      void window.thermalBridge.settings.update({ locale: next }).then(setSettings);
    }
  };

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <TooltipProvider>
      <I18nProvider locale={locale} setLocale={setLocale}>
        <AppShell settings={settings} setSettings={setSettings} onSettingsLocale={setLocaleState} />
        <Toaster />
      </I18nProvider>
    </TooltipProvider>
  );
}

function AppShell(props: {
  settings: AppSettings | null;
  setSettings: (settings: AppSettings) => void;
  onSettingsLocale: (locale: Locale) => void;
}) {
  const { t, locale, setLocale } = useI18n();
  const [screen, setScreen] = useState<Screen>('print');
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [usbDevices, setUsbDevices] = useState<PrinterInfo[]>([]);
  const [sppPorts, setSppPorts] = useState<PrinterInfo[]>([]);
  const [bleDevices, setBleDevices] = useState<PrinterInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [bleScanError, setBleScanError] = useState<string | null>(null);
  const bleScanLock = useRef(false);
  const bleScanQueued = useRef<{ durationMs: number; showBusy: boolean } | null>(null);
  const bleSightingsRef = useRef<BleSighting[]>([]);
  const [source, setSource] = useState<SourceDocument | null>(null);
  const [draft, setDraft] = useState<PrintDraft>(INITIAL_DRAFT);
  const [sourcePreview, setSourcePreview] = useState<{
    url: string;
    width: number;
    height: number;
  } | null>(null);
  const [pages, setPages] = useState<LabelPage[]>(() => [createBlankLabelPage()]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const labelSizeTouchedRef = useRef(false);
  const [status, setStatus] = useState(t('ready'));
  const [busy, setBusy] = useState(false);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourcePreviewUrlRef = useRef<string | null>(null);
  const labelLayoutRef = useRef({
    widthMm: draft.widthMm,
    heightMm: draft.heightMm,
    fitMode: draft.fitMode,
  });
  labelLayoutRef.current = {
    widthMm: draft.widthMm,
    heightMm: draft.heightMm,
    fitMode: draft.fitMode,
  };
  const dpi = MARKLIFE_X4.dpi;
  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? pages[0];
  const overlays = selectedPage?.overlays ?? [];

  const refreshPrinters = useCallback(async () => {
    if (!window.thermalBridge) {
      return;
    }
    try {
      setPrinters(await window.thermalBridge.printers.refresh());
    } catch {
      // Keep the last OS queue list so a failed poll does not look like a disconnect.
    }
  }, []);

  const refreshUsb = useCallback(async () => {
    if (!window.thermalBridge) {
      return;
    }
    try {
      setUsbDevices(await window.thermalBridge.printers.listUsb());
    } catch {
      // Keep the last USB list so a failed poll does not look like a disconnect.
    }
  }, []);

  const refreshSpp = useCallback(async () => {
    if (!window.thermalBridge) {
      return;
    }
    try {
      setSppPorts(await window.thermalBridge.printers.listBluetoothSpp());
    } catch {
      // Keep the last SPP list so a failed poll does not look like a disconnect.
    }
  }, []);

  const scanBle = useCallback(async (durationMs: number, showBusy: boolean) => {
    if (!window.thermalBridge) {
      return;
    }
    if (bleScanLock.current) {
      const queued = bleScanQueued.current;
      bleScanQueued.current = {
        durationMs: Math.max(queued?.durationMs ?? 0, durationMs),
        showBusy: Boolean(queued?.showBusy || showBusy),
      };
      if (showBusy) {
        setScanning(true);
      }
      return;
    }
    bleScanLock.current = true;
    if (showBusy) {
      setScanning(true);
    }
    try {
      const live = await window.thermalBridge.printers.scanBle(durationMs);
      const next = rememberBleSightings(bleSightingsRef.current, live, Date.now());
      bleSightingsRef.current = next;
      setBleDevices(devicesFromSightings(next));
      setBleScanError(null);
    } catch (error: unknown) {
      if (showBusy) {
        const message = formatError(error);
        setBleScanError(message);
        setStatus(message);
        toast.error(message);
      }
    } finally {
      bleScanLock.current = false;
      const queued = bleScanQueued.current;
      bleScanQueued.current = null;
      if (queued) {
        void scanBle(queued.durationMs, queued.showBusy);
      } else {
        setScanning(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!window.thermalBridge) {
      setStatus(t('preloadMissing'));
      setSettingsHydrated(true);
      return;
    }
    let cancelled = false;
    void window.thermalBridge.settings.get().then((value) => {
      if (cancelled) {
        return;
      }
      props.setSettings(value);
      if (value.locale) {
        props.onSettingsLocale(value.locale);
        document.documentElement.lang = value.locale;
      }
      setDraft((current) =>
        applySettingsToDraft(current, value, {
          preserveLabelSize: labelSizeTouchedRef.current,
        }),
      );
      setSettingsHydrated(true);
    });
    void refreshPrinters();
    void refreshUsb();
    void refreshSpp();
    return () => {
      cancelled = true;
    };
  }, [refreshPrinters, refreshUsb, refreshSpp, props.setSettings, props.onSettingsLocale]);

  useEffect(() => {
    if (!settingsHydrated || !labelSizeTouchedRef.current || !window.thermalBridge) {
      return;
    }
    void window.thermalBridge.settings
      .update({
        defaultLabelSize: labelSizeRecord(draft.widthMm, draft.heightMm),
      })
      .then(props.setSettings);
  }, [settingsHydrated, draft.widthMm, draft.heightMm, props.setSettings]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshPrinters();
      void refreshUsb();
      void refreshSpp();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [refreshPrinters, refreshUsb, refreshSpp]);

  useEffect(() => {
    if (screen !== 'setup') {
      return;
    }
    void refreshPrinters();
    void refreshUsb();
    void refreshSpp();
  }, [screen, refreshPrinters, refreshUsb, refreshSpp]);

  useEffect(() => {
    const backend = props.settings?.bindings.find((item) => item.printerId === draft.printerId)
      ?.backend;
    const wantsBle = screen === 'setup' || backend === 'bluetooth-ble';
    if (!wantsBle) {
      return;
    }
    void scanBle(BLE_SETUP_SCAN_MS, screen === 'setup');
    const timer = window.setInterval(() => {
      void scanBle(BLE_POLL_SCAN_MS, false);
    }, BLE_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [screen, draft.printerId, props.settings, scanBle]);

  useEffect(() => {
    if (!source) {
      sourceCanvasRef.current = null;
      if (sourcePreviewUrlRef.current) {
        URL.revokeObjectURL(sourcePreviewUrlRef.current);
        sourcePreviewUrlRef.current = null;
      }
      setSourcePreview(null);
      setPages((current) =>
        current.map((page) => ({ ...page, hasSource: false, contentBox: null })),
      );
      return;
    }
    let cancelled = false;
    void renderSourceBitmap({
      bytes: source.bytes,
      mimeType: source.mimeType,
      pageNumber: source.pageNumber,
      dpi,
    })
      .then(async (bitmap) => {
        const rotated = rotateSource(bitmap, draft.rotation);
        const size = intrinsicSize(rotated);
        const blob = await canvasToPngBlob(rotated);
        if (cancelled) {
          return;
        }
        sourceCanvasRef.current = rotated;
        if (sourcePreviewUrlRef.current) {
          URL.revokeObjectURL(sourcePreviewUrlRef.current);
        }
        const url = URL.createObjectURL(blob);
        sourcePreviewUrlRef.current = url;
        const layout = labelLayoutRef.current;
        setSourcePreview({ url, width: size.width, height: size.height });
        const fitted = boxFromFit({
          sourceWidthPx: size.width,
          sourceHeightPx: size.height,
          labelWidthMm: layout.widthMm,
          labelHeightMm: layout.heightMm,
          dpi,
          fitMode: layout.fitMode,
        });
        setPages((current) =>
          current.map((page) => (page.hasSource ? { ...page, contentBox: fitted } : page)),
        );
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : t('previewFailed');
        setStatus(message);
        toast.error(message);
      });
    return () => {
      cancelled = true;
    };
  }, [source, draft.rotation, dpi]);

  useEffect(() => {
    return () => {
      if (sourcePreviewUrlRef.current) {
        URL.revokeObjectURL(sourcePreviewUrlRef.current);
        sourcePreviewUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!sourcePreview) {
      return;
    }
    setPages((current) =>
      current.map((page) =>
        page.hasSource
          ? {
              ...page,
              contentBox: boxFromFit({
                sourceWidthPx: sourcePreview.width,
                sourceHeightPx: sourcePreview.height,
                labelWidthMm: draft.widthMm,
                labelHeightMm: draft.heightMm,
                dpi,
                fitMode: draft.fitMode,
              }),
            }
          : page,
      ),
    );
  }, [sourcePreview, draft.widthMm, draft.heightMm, draft.fitMode, dpi]);

  const updateDraft = (patch: Partial<PrintDraft>): void => {
    if (patch.widthMm !== undefined || patch.heightMm !== undefined) {
      labelSizeTouchedRef.current = true;
    }
    setDraft((current) => ({ ...current, ...patch }));
  };

  const loadBytes = async (name: string, mimeType: string, bytes: Uint8Array): Promise<void> => {
    try {
      const pageCount = mimeType === 'application/pdf' ? await pdfPageCount(bytes) : 1;
      setSource({ name, mimeType, bytes, pageCount, pageNumber: 1 });
      setPages((current) => {
        const target = current.find((page) => page.id === selectedPageId) ?? current[0];
        if (!target) {
          return [createBlankLabelPage()];
        }
        return current.map((page) => ({
          ...page,
          overlays: page.id === target.id ? [] : page.overlays,
          hasSource: page.id === target.id,
          contentBox: page.id === target.id ? page.contentBox : null,
        }));
      });
      setSelectedId(null);
      const message = t('loaded', { name });
      setStatus(message);
      toast.success(message);
    } catch (error: unknown) {
      const message = formatError(error);
      setStatus(message);
      toast.error(message);
    }
  };

  const onFile = (file: File): void => {
    const mimeType = resolveSourceMime(file.name, file.type);
    if (!mimeType) {
      const message = t('fileUnsupported');
      setStatus(message);
      toast.error(message);
      return;
    }
    void file
      .arrayBuffer()
      .then((buffer) => loadBytes(file.name, mimeType, copyToUint8Array(buffer)))
      .catch((error: unknown) => {
        const message = formatError(error);
        setStatus(message);
        toast.error(message);
      });
  };

  const onOpenDialog = (): void => {
    if (!window.thermalBridge) {
      setStatus(t('preloadMissing'));
      toast.error(t('preloadMissing'));
      return;
    }
    void window.thermalBridge.sources
      .openFile()
      .then((result) => {
        if (result) {
          const mimeType = resolveSourceMime(result.name, result.mimeType);
          if (!mimeType) {
            const message = t('fileUnsupported');
            setStatus(message);
            toast.error(message);
            return;
          }
          void loadBytes(result.name, mimeType, copyToUint8Array(result.data));
        }
      })
      .catch((error: unknown) => {
        const message = formatError(error);
        setStatus(message);
        toast.error(message);
      });
  };

  const bindPrinter = async (
    printer: PrinterInfo,
    extra: Partial<PrinterBinding> = {},
  ): Promise<void> => {
    const binding: PrinterBinding = {
      printerId: printer.id,
      profileId: draft.profileId,
      backend: printer.backend,
      systemName: printer.systemName,
      displayName: printer.name,
      ...extra,
    };
    const next = await window.thermalBridge.settings.update({
      lastPrinterId: printer.id,
      bindings: upsertBinding(props.settings?.bindings ?? [], binding),
    });
    props.setSettings(next);
    updateDraft({ printerId: printer.id });
    await refreshPrinters();
    await refreshUsb();
    await refreshSpp();
    const message = t('bound', { name: printer.name });
    setStatus(message);
    toast.success(message);
  };

  const openConnectPrinter = (): void => {
    setConnectOpen(true);
    void refreshPrinters();
    void refreshUsb();
    void refreshSpp();
    void scanBle(BLE_MANUAL_SCAN_MS, true);
  };

  const addOverlay = (overlay: OverlayElement): void => {
    setPages((current) => {
      const target = current.find((page) => page.id === selectedPageId) ?? current[0];
      if (!target) {
        return current;
      }
      return updateLabelPage(current, target.id, { overlays: [...target.overlays, overlay] });
    });
    setSelectedId(overlay.id);
  };
  const selectedOverlay = overlays.find((item) => item.id === selectedId);

  const patchSelectedOverlays = (map: (items: OverlayElement[]) => OverlayElement[]): void => {
    setPages((current) => {
      const target = current.find((page) => page.id === selectedPageId) ?? current[0];
      if (!target) {
        return current;
      }
      return updateLabelPage(current, target.id, { overlays: map(target.overlays) });
    });
  };

  const onPrint = (): void => {
    if (!draft.printerId) {
      setStatus(t('selectPrinterFirst'));
      toast.error(t('selectPrinterFirst'));
      return;
    }
    setBusy(true);
    const selectedBackend =
      printers.find((item) => item.id === draft.printerId)?.backend ??
      usbDevices.find((item) => item.id === draft.printerId)?.backend ??
      sppPorts.find((item) => item.id === draft.printerId)?.backend ??
      bleDevices.find((item) => item.id === draft.printerId)?.backend;
    const diagnostic = diagnosticRouteFromDraft({
      profileId: draft.profileId,
      ...(selectedBackend !== undefined ? { backend: selectedBackend } : {}),
      diagnosticTsplOverSpp: draft.diagnosticTsplOverSpp,
    });
    void (async () => {
      for (const [index, page] of pages.entries()) {
        const bitmap = await composePageBitmap({
          source: sourceCanvasRef.current,
          page,
          widthMm: draft.widthMm,
          heightMm: draft.heightMm,
          dpi,
          fitMode: draft.fitMode,
        });
        if (!bitmap) {
          throw new Error(t('previewFailed'));
        }
        const request: PrintRequest = {
          width: bitmap.width,
          height: bitmap.height,
          rgba: bitmap.rgba,
          widthMm: draft.widthMm,
          heightMm: draft.heightMm,
          dpi,
          density: draft.density,
          speed: draft.speed,
          copies: draft.copies,
          mediaMode: draft.mediaMode,
          gapHeightMm: draft.gapHeightMm,
          gapOffsetMm: draft.gapOffsetMm,
          markHeightMm: draft.markHeightMm,
          markOffsetMm: draft.markOffsetMm,
          dither: draft.dither,
          threshold: draft.threshold,
          rotation: 0,
          mirrorX: draft.mirrorX,
          mirrorY: draft.mirrorY,
          negative: draft.negative,
          offsetXmm: draft.offsetXmm,
          offsetYmm: draft.offsetYmm,
          fitMode: 'stretch',
          printerId: draft.printerId,
          profileId: draft.profileId,
          jobName: `${source?.name ?? 'ThermalBridge label'} ${index + 1}/${pages.length}`,
          ...(diagnostic !== undefined ? { diagnosticRoute: diagnostic } : {}),
        };
        const result = await window.thermalBridge.print.submit(request);
        setStatus(result.message);
      }
      toast.success(t('print'));
    })()
      .catch((error: unknown) => {
        const message = formatError(error);
        setStatus(message);
        toast.error(message);
      })
      .finally(() => setBusy(false));
  };

  const onTest = (): void => {
    if (!draft.printerId) {
      setStatus(t('selectPrinterFirst'));
      toast.error(t('selectPrinterFirst'));
      return;
    }
    setBusy(true);
    const selectedBackend =
      printers.find((item) => item.id === draft.printerId)?.backend ??
      usbDevices.find((item) => item.id === draft.printerId)?.backend ??
      sppPorts.find((item) => item.id === draft.printerId)?.backend ??
      bleDevices.find((item) => item.id === draft.printerId)?.backend;
    const diagnostic = diagnosticRouteFromDraft({
      profileId: draft.profileId,
      ...(selectedBackend !== undefined ? { backend: selectedBackend } : {}),
      diagnosticTsplOverSpp: draft.diagnosticTsplOverSpp,
    });
    void window.thermalBridge.print
      .testPage({
        printerId: draft.printerId,
        widthMm: draft.widthMm,
        heightMm: draft.heightMm,
        dpi,
        density: draft.density,
        speed: draft.speed,
        mediaMode: draft.mediaMode,
        gapHeightMm: draft.gapHeightMm,
        gapOffsetMm: draft.gapOffsetMm,
        profileId: draft.profileId,
        ...(diagnostic !== undefined ? { diagnosticRoute: diagnostic } : {}),
      })
      .then((result) => {
        setStatus(result.message);
        toast.success(result.message);
      })
      .catch((error: unknown) => {
        const message = formatError(error);
        setStatus(message);
        toast.error(message);
      })
      .finally(() => setBusy(false));
  };

  const catalog = useMemo(
    () => mergePrinterCatalog(printers, usbDevices, sppPorts, bleDevices),
    [printers, usbDevices, sppPorts, bleDevices],
  );
  const selectedBinding = props.settings?.bindings.find((item) => item.printerId === draft.printerId);
  const linkState = resolveLinkState({
    printerId: draft.printerId,
    ...(selectedBinding ? { binding: selectedBinding } : {}),
    printers: catalog,
    usbDevices,
    sppPorts,
    bleDevices,
  });
  const selectedPrinter = catalog.find((item) => item.id === draft.printerId);
  const profile = PROFILES.find((item) => item.id === draft.profileId) ?? MARKLIFE_X4;
  const printDisabled = busy || profile.status === 'planned';

  const nav: Array<{ id: Screen; label: string; icon: ReactNode }> = [
    { id: 'print', label: t('navPrint'), icon: <Printer /> },
    { id: 'setup', label: t('navPrinters'), icon: <Settings2 /> },
    { id: 'calibration', label: t('navCalibration'), icon: <SlidersHorizontal /> },
    { id: 'diagnostics', label: t('navDiagnostics'), icon: <Activity /> },
  ];

  return (
    <div className="flex h-full bg-ink-900">
      <aside className="flex w-12 shrink-0 flex-col items-center border-r border-white/5 bg-ink-950 py-3 text-ink-300">
        <p className="mb-3 flex size-8 items-center justify-center rounded-md bg-primary/15 text-[10px] font-bold tracking-tight text-primary">
          TB
        </p>
        <nav className="flex flex-1 flex-col items-center gap-1">
          {nav.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className={cn(
                    'text-ink-300 hover:bg-ink-800 hover:text-ink-50',
                    screen === item.id && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
                  )}
                  aria-label={item.label}
                  onClick={() => setScreen(item.id)}
                >
                  {item.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-ink-300 hover:bg-ink-800 hover:text-ink-50"
              aria-label={t('language')}
            >
              <Languages />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" className="w-48">
            <DropdownMenuRadioGroup
              value={locale}
              onValueChange={(value) => setLocale(value as Locale)}
            >
              <DropdownMenuRadioItem value="ro">{t('languageRo')}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="en">{t('languageEn')}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </aside>

      <main
        className={cn(
          'min-w-0 flex-1',
          screen === 'print' ? 'overflow-hidden p-0' : 'overflow-auto p-4',
        )}
      >
        {screen === 'print' ? (
          <div className="relative h-full min-h-0">
            <PreviewPane
              source={source}
              sourceUrl={sourcePreview?.url ?? null}
              sourceWidthPx={sourcePreview?.width ?? 0}
              sourceHeightPx={sourcePreview?.height ?? 0}
              pages={pages}
              selectedPageId={selectedPage?.id ?? ''}
              widthMm={draft.widthMm}
              heightMm={draft.heightMm}
              dpi={dpi}
              fitMode={draft.fitMode}
              rotation={draft.rotation}
              onContentBox={(box) => {
                if (!selectedPage) {
                  return;
                }
                setPages((current) => updateLabelPage(current, selectedPage.id, { contentBox: box }));
              }}
              onFitMode={(fitMode) => updateDraft({ fitMode })}
              onRotation={(rotation) => updateDraft({ rotation })}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onSelectPage={setSelectedPageId}
              onAddPageAfter={(id) => {
                const result = insertLabelPageAfter(pages, id);
                setPages(result.pages);
                setSelectedPageId(result.inserted.id);
                setSelectedId(null);
              }}
              onDuplicatePage={(id) => {
                const result = duplicateLabelPage(pages, id);
                setPages(result.pages);
                setSelectedPageId(result.inserted.id);
                setSelectedId(null);
              }}
              onDeletePage={(id) => {
                const next = removeLabelPage(pages, id);
                setPages(next);
                if (selectedPageId === id) {
                  const keep = next[0];
                  if (keep) {
                    setSelectedPageId(keep.id);
                  }
                }
                setSelectedId(null);
              }}
              onOverlayChange={(id, patch) =>
                patchSelectedOverlays((current) =>
                  current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
                )
              }
              onAddText={() => addOverlay(createTextOverlay(draft.widthMm, draft.heightMm))}
              onAddQr={() => addOverlay(createQrOverlay(draft.widthMm, draft.heightMm))}
              onAddBarcode={() => addOverlay(createBarcodeOverlay(draft.widthMm, draft.heightMm))}
              onAddRect={() => addOverlay(createRectOverlay(draft.widthMm, draft.heightMm))}
              onAddLine={() => addOverlay(createLineOverlay(draft.widthMm, draft.heightMm))}
              onAddImage={(src, naturalWidth, naturalHeight) =>
                addOverlay(
                  createImageOverlay(draft.widthMm, draft.heightMm, src, naturalWidth, naturalHeight),
                )
              }
              onDuplicate={() => {
                if (!selectedId || selectedId === AWB_IMAGE_ID) {
                  return;
                }
                const current = overlays.find((item) => item.id === selectedId);
                if (!current) {
                  return;
                }
                addOverlay(duplicateOverlay(current));
              }}
              onDeleteSelected={() => {
                if (!selectedId || selectedId === AWB_IMAGE_ID) {
                  return;
                }
                patchSelectedOverlays((current) => current.filter((item) => item.id !== selectedId));
                setSelectedId(null);
              }}
              onCenter={() => {
                if (!selectedOverlay) {
                  return;
                }
                patchSelectedOverlays((current) =>
                  current.map((item) =>
                    item.id === selectedOverlay.id
                      ? { ...item, ...centerOverlay(item, draft.widthMm, draft.heightMm) }
                      : item,
                  ),
                );
              }}
              onCenterH={() => {
                if (!selectedOverlay) {
                  return;
                }
                patchSelectedOverlays((current) =>
                  current.map((item) =>
                    item.id === selectedOverlay.id
                      ? { ...item, ...centerOverlayH(item, draft.widthMm) }
                      : item,
                  ),
                );
              }}
              onCenterV={() => {
                if (!selectedOverlay) {
                  return;
                }
                patchSelectedOverlays((current) =>
                  current.map((item) =>
                    item.id === selectedOverlay.id
                      ? { ...item, ...centerOverlayV(item, draft.heightMm) }
                      : item,
                  ),
                );
              }}
              onZOrder={(direction) => {
                if (!selectedId || selectedId === AWB_IMAGE_ID) {
                  return;
                }
                patchSelectedOverlays((current) => moveOverlayZ(current, selectedId, direction));
              }}
              onConnectPrinter={openConnectPrinter}
              onLabelSize={(size) => updateDraft(size)}
              onFile={onFile}
              onOpenDialog={onOpenDialog}
              onPageChange={(page) =>
                setSource((current) => (current ? { ...current, pageNumber: page } : current))
              }
              onPrint={onPrint}
              printerName={selectedPrinter?.name ?? null}
              linkState={linkState}
              printDisabled={printDisabled}
              busy={busy}
              shortcutsEnabled={!connectOpen}
            />
            <div className="absolute top-14 right-3 bottom-3 z-20 w-72">
              <PrintPane
                draft={draft}
                printers={catalog}
                linkState={linkState}
                busy={busy}
                status={status}
                onChange={updateDraft}
                onPrint={onPrint}
                onTest={onTest}
                onConnectPrinter={openConnectPrinter}
              />
            </div>
          </div>
        ) : null}

        {screen === 'setup' ? (
          <PrinterSetup
            printers={printers}
            usbDevices={usbDevices}
            sppPorts={sppPorts}
            bleDevices={bleDevices}
            scanning={scanning}
            scanError={bleScanError}
            selectedId={draft.printerId}
            onSelect={(printer, extra) => {
              void bindPrinter(printer, extra);
            }}
            onRefresh={() => {
              void refreshPrinters();
            }}
            onRefreshUsb={() => {
              void refreshUsb();
            }}
            onRefreshSpp={() => {
              void refreshSpp();
            }}
            onScanBle={() => {
              void scanBle(BLE_MANUAL_SCAN_MS, true);
            }}
            onOpenBluetoothPairing={async () => {
              try {
                await window.thermalBridge.printers.openBluetoothPairing();
                await refreshSpp();
                void scanBle(BLE_SETUP_SCAN_MS, true);
              } catch (error: unknown) {
                const message = formatError(error);
                setStatus(message);
                toast.error(message);
                throw error;
              }
            }}
          />
        ) : null}

        {screen === 'calibration' ? (
          <CalibrationPane
            draft={draft}
            onChange={updateDraft}
            onTest={onTest}
            onSave={() => {
              const current = props.settings?.bindings.find((item) => item.printerId === draft.printerId);
              if (!current) {
                setStatus(t('selectBeforeCalib'));
                toast.error(t('selectBeforeCalib'));
                return;
              }
              void window.thermalBridge.settings
                .update({
                  bindings: upsertBinding(props.settings?.bindings ?? [], {
                    ...current,
                    offsetXmm: draft.offsetXmm,
                    offsetYmm: draft.offsetYmm,
                    density: draft.density,
                    speed: draft.speed,
                  }),
                })
                .then((value) => {
                  props.setSettings(value);
                  setStatus(t('calibrationSaved'));
                  toast.success(t('calibrationSaved'));
                });
            }}
          />
        ) : null}

        {screen === 'diagnostics' ? <DiagnosticsPane /> : null}
      </main>
      <ConnectPrinterDialog
        open={connectOpen}
        printers={printers}
        usbDevices={usbDevices}
        sppPorts={sppPorts}
        bleDevices={bleDevices}
        scanning={scanning}
        scanError={bleScanError}
        selectedId={draft.printerId}
        onClose={() => setConnectOpen(false)}
        onSelect={(printer, extra) => {
          void bindPrinter(printer, extra).then(() => setConnectOpen(false));
        }}
        onRefresh={() => {
          void refreshPrinters();
        }}
        onRefreshUsb={() => {
          void refreshUsb();
        }}
        onRefreshSpp={() => {
          void refreshSpp();
        }}
        onScanBle={() => {
          void scanBle(BLE_MANUAL_SCAN_MS, true);
        }}
        onOpenBluetoothPairing={async () => {
          try {
            await window.thermalBridge.printers.openBluetoothPairing();
            await refreshSpp();
            void scanBle(BLE_SETUP_SCAN_MS, true);
          } catch (error: unknown) {
            const message = formatError(error);
            setStatus(message);
            toast.error(message);
            throw error;
          }
        }}
      />
    </div>
  );
}

function upsertBinding(list: PrinterBinding[], binding: PrinterBinding): PrinterBinding[] {
  const next = list.filter((item) => item.printerId !== binding.printerId);
  next.push(binding);
  return next;
}

function formatError(error: unknown): string {
  if (error instanceof ThermalBridgeError) {
    return `${error.code}: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function composePageBitmap(options: {
  source: HTMLCanvasElement | null;
  page: LabelPage;
  widthMm: number;
  heightMm: number;
  dpi: number;
  fitMode: PrintDraft['fitMode'];
}): Promise<{ width: number; height: number; rgba: Uint8Array } | null> {
  const composed =
    options.page.hasSource && options.source && options.page.contentBox
      ? renderLabelCanvas({
          source: options.source,
          widthMm: options.widthMm,
          heightMm: options.heightMm,
          dpi: options.dpi,
          fitMode: options.fitMode,
          rotation: 0,
          contentBox: options.page.contentBox,
        })
      : createBlankLabelCanvas(options.widthMm, options.heightMm, options.dpi);
  const ctx = composed.canvas.getContext('2d');
  if (!ctx) {
    return null;
  }
  await drawOverlays(ctx, options.page.overlays, options.dpi);
  return {
    width: composed.width,
    height: composed.height,
    rgba: new Uint8Array(ctx.getImageData(0, 0, composed.width, composed.height).data),
  };
}
