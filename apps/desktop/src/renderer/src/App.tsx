import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  MARKLIFE_X4,
  PROFILES,
  applyD210PrintSettings,
  applyProfilePrintSettings,
  profileDefaultPrintSettings,
  DEFAULT_D210_PRINT_SETTINGS,
  inferPrinterProfile,
  labelSizeRecord,
  labelSizesForProfile,
  printableWidthMm,
  profileColorModel,
} from '@thermalbridge/printer-profiles';
import {
  computeFitRect,
  enhanceDocumentRgba,
  isBelowPrintResolution,
  mmToDots,
  prepareInkjetRgba,
  type Rotation,
} from '@thermalbridge/thermal-core';
import type {
  AppSettings,
  LabelTemplateMeta,
  MediaFileMeta,
  MenuFitMode,
  PrinterBinding,
  PrinterInfo,
  PrintHistoryMeta,
  PrintRequest,
  Screen,
} from '@thermalbridge/shared';
import { isMediaMimeType, ThermalBridgeError } from '@thermalbridge/shared';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner.js';
import { TooltipProvider } from '@/components/ui/tooltip.js';
import {
  createCommandHandlers,
  type AppCommandActions,
  type PreviewCommandsHandle,
} from '@/features/commands/command-handlers.js';
import { buildMenuState } from '@/features/commands/menu-state.js';
import { ModalProvider, useModalState } from '@/features/commands/modal-context.js';
import { useCommands } from '@/features/commands/use-commands.js';
import { useMenuSync } from '@/features/commands/use-menu-sync.js';
import { AppSidebar } from '@/features/layout/AppSidebar.js';
import { WorkspaceRightPane } from '@/features/layout/WorkspaceRightPane.js';
import { SaveTemplateDialog } from '@/features/library/SaveTemplateDialog.js';
import { CalibrationPane } from '@/features/calibration/CalibrationPane.js';
import { HistoryPane } from '@/features/library/HistoryPane.js';
import { LibraryPane } from '@/features/library/LibraryPane.js';
import { printHistoryInput } from '@/features/library/print-history.js';
import { printRgbaForProfile } from '@/features/print/print-rgba.js';
import { sourcePrepForPage } from '@/features/print/source-prep.js';
import { rgbaFromPngBytes } from '@/features/library/png-rgba.js';
import { DiagnosticsPane } from '@/features/diagnostics/DiagnosticsPane.js';
import { PreviewPane } from '@/features/preview/PreviewPane.js';
import { pdfPageCount } from '@/features/preview/pdf.js';
import { copyToUint8Array, resolveSourceMime } from '@/features/import/source-bytes.js';
import {
  CONTENT_SCALE_MAX,
  CONTENT_SCALE_MIN,
  boxFromFit,
  scaleBoxToPercent,
  scalePercentFromBox,
} from '@/features/preview/content-placement.js';
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
  createArrowOverlay,
  createBarcodeOverlay,
  createCircleOverlay,
  createFieldOverlay,
  createIconOverlay,
  createImageOverlay,
  createLineOverlay,
  createQrOverlay,
  createRectOverlay,
  createTableOverlay,
  createTextOverlay,
  duplicateOverlay,
  moveOverlayZ,
  type OverlayElement,
} from '@/features/editor/overlay.js';
import { hasIncrementingFields } from '@/features/editor/field-value.js';
import {
  assignSourceToCurrentPage,
  createBlankLabelPage,
  LABEL_PAGE_MAX,
  pagesForImportedPdf,
  duplicateLabelPage,
  insertLabelPageAfter,
  pagesFromTemplate,
  removeLabelPage,
  resolveSelectedPage,
  scaleLabelPageX,
  templatePagesFromLabel,
  updateLabelPage,
  type LabelPage,
} from '@/features/editor/label-pages.js';
import { deleteSelectedFromPage } from '@/features/editor/delete-selection.js';
import {
  putPageSource,
  releaseAllPageSources,
  releasePageSource,
  revertEnhancedSource,
  sourceUrlsFromMap,
  type PageSourceMap,
} from '@/features/editor/page-sources.js';
import { AWB_IMAGE_ID } from '@/features/editor/LabelCanvas.js';
import { EditorInspector } from '@/features/editor/EditorInspector.js';
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
import type { PrintDraft, SourceDocument } from '@/state/types.js';
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
  d210: DEFAULT_D210_PRINT_SETTINGS,
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
      <ModalProvider>
        <I18nProvider locale={locale} setLocale={setLocale}>
          <AppShell settings={settings} setSettings={setSettings} onSettingsLocale={setLocaleState} />
          <Toaster />
        </I18nProvider>
      </ModalProvider>
    </TooltipProvider>
  );
}

function AppShell(props: {
  settings: AppSettings | null;
  setSettings: (settings: AppSettings) => void;
  onSettingsLocale: (locale: Locale) => void;
}) {
  const { t, locale, setLocale } = useI18n();
  const { modalOpen } = useModalState();
  const previewRef = useRef<PreviewCommandsHandle>(null);
  const [screen, setScreen] = useState<Screen>('print');
  const [showGrid, setShowGrid] = useState(false);
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [usbDevices, setUsbDevices] = useState<PrinterInfo[]>([]);
  const [sppPorts, setSppPorts] = useState<PrinterInfo[]>([]);
  const [bleDevices, setBleDevices] = useState<PrinterInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [bleScanError, setBleScanError] = useState<string | null>(null);
  const bleScanLock = useRef(false);
  const bleScanQueued = useRef<{ durationMs: number; showBusy: boolean } | null>(null);
  const bleSightingsRef = useRef<BleSighting[]>([]);
  const [draft, setDraft] = useState<PrintDraft>(INITIAL_DRAFT);
  const [pageSources, setPageSources] = useState<PageSourceMap>({});
  const [cleanupBannerDismissed, setCleanupBannerDismissed] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [pages, setPages] = useState<LabelPage[]>(() => [createBlankLabelPage()]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const labelSizeTouchedRef = useRef(false);
  const [status, setStatus] = useState(t('ready'));
  const [busy, setBusy] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaFileMeta[]>([]);
  const [historyItems, setHistoryItems] = useState<PrintHistoryMeta[]>([]);
  const [templateItems, setTemplateItems] = useState<LabelTemplateMeta[]>([]);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const pageSourcesRef = useRef<PageSourceMap>({});
  const selectedPageIdRef = useRef(selectedPageId);
  const profile = PROFILES.find((item) => item.id === draft.profileId) ?? MARKLIFE_X4;
  const dpi = profile.dpi;
  const canvasWidthMm = printableWidthMm(draft.widthMm, profile.maxWidthMm);
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
  pageSourcesRef.current = pageSources;
  selectedPageIdRef.current = selectedPageId;
  const selectedPage = resolveSelectedPage(pages, selectedPageId);
  const selectedSource = selectedPage ? pageSources[selectedPage.id] : undefined;
  const source = selectedSource?.document ?? null;
  const sourcePreview = selectedSource
    ? { url: selectedSource.previewUrl, width: selectedSource.width, height: selectedSource.height }
    : null;
  const overlays = selectedPage?.overlays ?? [];
  const prevWidthRef = useRef(draft.widthMm);

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
    const from = prevWidthRef.current;
    const to = draft.widthMm;
    prevWidthRef.current = to;
    if (from !== to) {
      setPages((current) => current.map((page) => scaleLabelPageX(page, from, to)));
    }
  }, [draft.widthMm]);

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
    const first = pages[0];
    if (!selectedPageId && first) {
      setSelectedPageId(first.id);
    }
  }, [pages, selectedPageId]);

  const materializePageSource = useCallback(
    async (
      pageId: string,
      document: SourceDocument,
      options?: { forceEnhance?: boolean },
    ): Promise<void> => {
      const bitmap = await renderSourceBitmap({
        bytes: document.bytes,
        mimeType: document.mimeType,
        pageNumber: document.pageNumber,
        dpi,
      });
      const rotated = rotateSource(bitmap, draft.rotation);
      const size = intrinsicSize(rotated);
      const layout = labelLayoutRef.current;
      setCleanupBannerDismissed((current) => {
        if (!current.has(pageId)) {
          return current;
        }
        const next = new Set(current);
        next.delete(pageId);
        return next;
      });
      let display = rotated;
      let enhanced = false;
      let originalCanvas: HTMLCanvasElement | undefined;
      const colorModel = profileColorModel(profile);
      const belowResolution = isBelowPrintResolution({
        sourceWidth: size.width,
        sourceHeight: size.height,
        widthMm: layout.widthMm,
        heightMm: layout.heightMm,
        dpi,
      });
      const prep = sourcePrepForPage({
        mimeType: document.mimeType,
        colorModel,
        belowResolution,
        ...(options?.forceEnhance === true ? { forceEnhance: true } : {}),
      });
      if (prep.upscale || prep.color !== 'none') {
        try {
          if (prep.color === 'thermal-enhance') {
            originalCanvas = cloneCanvas(rotated);
          }
          const working = prep.upscale
            ? upscaleToPrintFit(rotated, layout.widthMm, layout.heightMm, dpi)
            : rotated;
          const ctx = working.getContext('2d');
          if (!ctx) {
            throw new Error(t('previewFailed'));
          }
          const rgba = new Uint8Array(ctx.getImageData(0, 0, working.width, working.height).data);
          const nextRgba =
            prep.color === 'thermal-enhance'
              ? enhanceDocumentRgba(rgba, working.width, working.height)
              : prep.color === 'inkjet-cmyk'
                ? prepareInkjetRgba(rgba)
                : rgba;
          if (nextRgba !== rgba) {
            ctx.putImageData(
              new ImageData(new Uint8ClampedArray(nextRgba), working.width, working.height),
              0,
              0,
            );
          }
          display = working;
          if (prep.color === 'thermal-enhance') {
            enhanced = true;
            if (belowResolution) {
              toast.warning(t('photoLowResCleanup'));
            }
          } else if (prep.upscale) {
            toast.warning(t('inkjetLowResPrep', { n: dpi }));
          }
        } catch {
          toast.error(t('photoCleanupFailed'));
        }
      }
      const blob = await canvasToPngBlob(display);
      const url = URL.createObjectURL(blob);
      const fitted = boxFromFit({
        sourceWidthPx: display.width,
        sourceHeightPx: display.height,
        labelWidthMm: layout.widthMm,
        labelHeightMm: layout.heightMm,
        dpi,
        fitMode: layout.fitMode,
      });
      setPageSources((current) =>
        putPageSource(
          current,
          pageId,
          {
            document,
            previewUrl: url,
            width: display.width,
            height: display.height,
            canvas: display,
            ...(enhanced && originalCanvas !== undefined
              ? { enhanced: true, originalCanvas }
              : {}),
          },
          (revoked) => URL.revokeObjectURL(revoked),
        ),
      );
      setPages((current) =>
        updateLabelPage(assignSourceToCurrentPage(current, pageId), pageId, {
          hasSource: true,
          contentBox: fitted,
        }),
      );
    },
    [dpi, draft.rotation, profile, t],
  );

  useEffect(() => {
    return () => {
      releaseAllPageSources(pageSourcesRef.current, (url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    setPages((current) =>
      current.map((page) => {
        const assets = pageSourcesRef.current[page.id];
        if (!page.hasSource || !assets) {
          return page;
        }
        return {
          ...page,
          contentBox: boxFromFit({
            sourceWidthPx: assets.width,
            sourceHeightPx: assets.height,
            labelWidthMm: draft.widthMm,
            labelHeightMm: draft.heightMm,
            dpi,
            fitMode: draft.fitMode,
          }),
        };
      }),
    );
  }, [draft.widthMm, draft.heightMm, draft.fitMode, dpi]);

  const colorModel = profileColorModel(profile);
  const rotationDpiRef = useRef({ rotation: draft.rotation, dpi, colorModel });
  useEffect(() => {
    const previous = rotationDpiRef.current;
    if (
      previous.rotation === draft.rotation &&
      previous.dpi === dpi &&
      previous.colorModel === colorModel
    ) {
      return;
    }
    rotationDpiRef.current = { rotation: draft.rotation, dpi, colorModel };
    for (const [pageId, assets] of Object.entries(pageSourcesRef.current)) {
      void materializePageSource(pageId, assets.document).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : t('previewFailed');
        setStatus(message);
        toast.error(message);
      });
    }
  }, [colorModel, draft.rotation, dpi, materializePageSource, t]);

  const updateDraft = (patch: Partial<PrintDraft>): void => {
    if (patch.widthMm !== undefined || patch.heightMm !== undefined) {
      labelSizeTouchedRef.current = true;
    }
    setDraft((current) => {
      const next = { ...current, ...patch };
      const nextProfile = PROFILES.find((item) => item.id === next.profileId) ?? MARKLIFE_X4;
      const profileChanged =
        patch.profileId !== undefined && patch.profileId !== current.profileId;
      const clamped = applyProfilePrintSettings(nextProfile, next);
      return {
        ...next,
        ...clamped,
        ...(profileChanged ? profileDefaultPrintSettings(nextProfile) : {}),
        d210: applyD210PrintSettings(next.d210),
      };
    });
  };

  const loadBytes = async (
    name: string,
    mimeType: string,
    bytes: Uint8Array,
    options: { remember?: boolean } = {},
  ): Promise<void> => {
    try {
      const pageCount = mimeType === 'application/pdf' ? await pdfPageCount(bytes) : 1;
      const target = resolveSelectedPage(pages, selectedPageIdRef.current);
      if (!target) {
        throw new Error(t('previewFailed'));
      }
      const explodePdf = mimeType === 'application/pdf' && pageCount > 1;
      setSelectedId(null);
      if (explodePdf) {
        const nextPages = pagesForImportedPdf(pageCount, target);
        const first = nextPages[0];
        if (!first) {
          throw new Error(t('previewFailed'));
        }
        flushSync(() => {
          setPages(nextPages);
          setSelectedPageId(first.id);
        });
        for (const [index, page] of nextPages.entries()) {
          await materializePageSource(page.id, {
            name,
            mimeType,
            bytes,
            pageCount,
            pageNumber: index + 1,
          });
        }
      } else {
        setPages((current) => assignSourceToCurrentPage(current, target.id));
        await materializePageSource(target.id, {
          name,
          mimeType,
          bytes,
          pageCount,
          pageNumber: 1,
        });
      }
      if (options.remember !== false && isMediaMimeType(mimeType) && window.thermalBridge) {
        void window.thermalBridge.library
          .addMedia({ name, mimeType, data: bytes })
          .then((item) => {
            setMediaItems((current) => {
              const without = current.filter((entry) => entry.id !== item.id);
              return [item, ...without];
            });
          })
          .catch(() => {
            // Library persistence is best-effort.
          });
      }
      const message = explodePdf
        ? t('loadedPages', { name, n: Math.min(pageCount, LABEL_PAGE_MAX) })
        : t('loaded', { name });
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
    const profileId = inferPrinterProfile(printer) ?? draft.profileId;
    const binding: PrinterBinding = {
      printerId: printer.id,
      profileId,
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
    updateDraft({ printerId: printer.id, profileId });
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
      const target = resolveSelectedPage(current, selectedPageIdRef.current);
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
      const target = resolveSelectedPage(current, selectedPageIdRef.current);
      if (!target) {
        return current;
      }
      return updateLabelPage(current, target.id, { overlays: map(target.overlays) });
    });
  };

  const onRevertCleanup = (): void => {
    const page = selectedPage;
    if (!page) {
      return;
    }
    const assets = pageSources[page.id];
    if (!assets?.originalCanvas) {
      return;
    }
    void canvasToPngBlob(assets.originalCanvas)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const reverted = revertEnhancedSource(assets, url);
        if (!reverted) {
          URL.revokeObjectURL(url);
          return;
        }
        const layout = labelLayoutRef.current;
        setPageSources((current) =>
          putPageSource(current, page.id, reverted, (revoked) => URL.revokeObjectURL(revoked)),
        );
        setPages((current) =>
          updateLabelPage(current, page.id, {
            contentBox: boxFromFit({
              sourceWidthPx: reverted.width,
              sourceHeightPx: reverted.height,
              labelWidthMm: layout.widthMm,
              labelHeightMm: layout.heightMm,
              dpi,
              fitMode: layout.fitMode,
            }),
          }),
        );
      })
      .catch((error: unknown) => {
        toast.error(formatError(error));
      });
  };

  const onDismissCleanup = (): void => {
    if (!selectedPage) {
      return;
    }
    setCleanupBannerDismissed((current) => new Set(current).add(selectedPage.id));
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
        const incrementing = hasIncrementingFields(page.overlays);
        const copyPasses = incrementing ? draft.copies : 1;
        const requestCopies = incrementing ? 1 : draft.copies;
        for (let copyIndex = 0; copyIndex < copyPasses; copyIndex += 1) {
          const bitmap = await composePageBitmap({
            source: pageSources[page.id]?.canvas ?? null,
            page,
            widthMm: draft.widthMm,
            heightMm: draft.heightMm,
            dpi,
            fitMode: draft.fitMode,
            copyIndex,
          });
          if (!bitmap) {
            throw new Error(t('previewFailed'));
          }
          const request: PrintRequest = {
            width: bitmap.width,
            height: bitmap.height,
            rgba: printRgbaForProfile(draft.profileId, bitmap.rgba),
            widthMm: draft.widthMm,
            heightMm: draft.heightMm,
            dpi,
            density: draft.density,
            speed: draft.speed,
            copies: requestCopies,
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
            fitMode: 'actual',
            printerId: draft.printerId,
            profileId: draft.profileId,
            jobName: `${pageSources[page.id]?.document.name ?? source?.name ?? 'ThermalBridge label'} ${index + 1}/${pages.length}`,
            ...(diagnostic !== undefined ? { diagnosticRoute: diagnostic } : {}),
          };
          const result = await window.thermalBridge.print.submit(request);
          setStatus(result.message);
          if (copyIndex === 0) {
            try {
              const blob = await canvasToPngBlob(bitmap.canvas);
              const png = copyToUint8Array(await blob.arrayBuffer());
              const printerName =
                printers.find((item) => item.id === draft.printerId)?.name ??
                usbDevices.find((item) => item.id === draft.printerId)?.name ??
                sppPorts.find((item) => item.id === draft.printerId)?.name ??
                bleDevices.find((item) => item.id === draft.printerId)?.name ??
                draft.printerId;
              const saved = await window.thermalBridge.library.addHistory(
                printHistoryInput({
                  jobName: request.jobName,
                  printerName,
                  draft,
                  widthMm: draft.widthMm,
                  heightMm: draft.heightMm,
                  width: bitmap.width,
                  height: bitmap.height,
                  dpi,
                  copies: request.copies,
                  png,
                }),
              );
              setHistoryItems((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
            } catch {
              // History persistence is best-effort.
            }
          }
        }
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
        widthMm: canvasWidthMm,
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

  // ─── Image controls hoisted to App level so PrintPane can drive them ───────
  const selectedFitBox = useMemo(() => {
    const w = selectedSource?.width ?? 0;
    const h = selectedSource?.height ?? 0;
    if (w <= 0 || h <= 0) {
      return null;
    }
    return boxFromFit({
      sourceWidthPx: w,
      sourceHeightPx: h,
      labelWidthMm: draft.widthMm,
      labelHeightMm: draft.heightMm,
      dpi,
      fitMode: draft.fitMode,
    });
  }, [selectedSource?.width, selectedSource?.height, draft.widthMm, draft.heightMm, dpi, draft.fitMode]);

  const contentScalePercent = useMemo(() => {
    const cb = selectedPage?.contentBox ?? null;
    if (!cb || !selectedFitBox) {
      return null;
    }
    return scalePercentFromBox(cb, selectedFitBox);
  }, [selectedPage?.contentBox, selectedFitBox]);

  const onContentScale = (percent: number): void => {
    const cb = selectedPage?.contentBox ?? null;
    if (!selectedPage || !cb || !selectedFitBox) {
      return;
    }
    setPages((current) =>
      updateLabelPage(current, selectedPage.id, {
        contentBox: scaleBoxToPercent(cb, selectedFitBox, percent),
      }),
    );
  };

  const onEnhance = (): void => {
    if (!selectedPage) {
      return;
    }
    const assets = pageSources[selectedPage.id];
    if (!assets) {
      return;
    }
    void materializePageSource(selectedPage.id, assets.document, { forceEnhance: true }).catch(
      (error: unknown) => {
        toast.error(formatError(error));
      },
    );
  };
  // ────────────────────────────────────────────────────────────────────────────

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
  const printDisabled = busy || profile.status === 'planned';

  const refreshLibrary = useCallback((): void => {
    if (!window.thermalBridge) {
      return;
    }
    void Promise.all([
      window.thermalBridge.library.listMedia(),
      window.thermalBridge.library.listHistory(),
      window.thermalBridge.library.listTemplates(),
    ])
      .then(([media, history, templates]) => {
        setMediaItems(media);
        setHistoryItems(history);
        setTemplateItems(templates);
      })
      .catch(() => {
        // Listing is best-effort until the user opens the panes.
      });
  }, []);

  useEffect(() => {
    if (screen === 'history' || screen === 'library') {
      refreshLibrary();
    }
  }, [screen, refreshLibrary]);

  const reprintHistory = (id: string): void => {
    if (!draft.printerId) {
      setStatus(t('selectPrinterFirst'));
      toast.error(t('selectPrinterFirst'));
      return;
    }
    const entry = historyItems.find((item) => item.id === id);
    if (!entry) {
      return;
    }
    setBusy(true);
    void (async () => {
      const png = copyToUint8Array(await window.thermalBridge.library.getHistoryPng(id));
      const bitmap = await rgbaFromPngBytes(png);
      const request: PrintRequest = {
        width: bitmap.width,
        height: bitmap.height,
        rgba: printRgbaForProfile(entry.profileId, bitmap.rgba),
        widthMm: entry.widthMm,
        heightMm: entry.heightMm,
        dpi: entry.dpi,
        density: entry.density,
        speed: entry.speed,
        copies: entry.copies,
        mediaMode: entry.mediaMode,
        gapHeightMm: entry.gapHeightMm,
        gapOffsetMm: entry.gapOffsetMm,
        markHeightMm: entry.markHeightMm,
        markOffsetMm: entry.markOffsetMm,
        dither: entry.dither,
        threshold: entry.threshold,
        rotation: entry.rotation,
        mirrorX: entry.mirrorX,
        mirrorY: entry.mirrorY,
        negative: entry.negative,
        offsetXmm: entry.offsetXmm,
        offsetYmm: entry.offsetYmm,
        fitMode: 'actual',
        printerId: draft.printerId,
        profileId: entry.profileId,
        jobName: entry.jobName,
      };
      const result = await window.thermalBridge.print.submit(request);
      setStatus(result.message);
      toast.success(t('print'));
    })()
      .catch((error: unknown) => {
        const message = formatError(error);
        setStatus(message);
        toast.error(message);
      })
      .finally(() => setBusy(false));
  };

  const openHistory = (id: string): void => {
    const entry = historyItems.find((item) => item.id === id);
    if (!entry) {
      return;
    }
    void window.thermalBridge.library
      .getHistoryPng(id)
      .then((png) => {
        updateDraft({
          widthMm: entry.widthMm,
          heightMm: entry.heightMm,
          copies: entry.copies,
          density: entry.density,
          speed: entry.speed,
          mediaMode: entry.mediaMode,
          gapHeightMm: entry.gapHeightMm,
          gapOffsetMm: entry.gapOffsetMm,
          dither: entry.dither,
          threshold: entry.threshold,
          offsetXmm: entry.offsetXmm,
          offsetYmm: entry.offsetYmm,
        });
        return loadBytes(`${entry.jobName}.png`, 'image/png', copyToUint8Array(png), {
          remember: false,
        });
      })
      .then(() => setScreen('print'))
      .catch((error: unknown) => {
        const message = formatError(error);
        setStatus(message);
        toast.error(message);
      });
  };

  const openMedia = (id: string): void => {
    void window.thermalBridge.library
      .getMedia(id)
      .then((file) =>
        loadBytes(file.meta.name, file.meta.mimeType, copyToUint8Array(file.data), {
          remember: false,
        }),
      )
      .then(() => setScreen('print'))
      .catch((error: unknown) => {
        const message = formatError(error);
        setStatus(message);
        toast.error(message);
      });
  };

  const applyTemplateById = (id: string): void => {
    void window.thermalBridge.library
      .getTemplate(id)
      .then((template) => {
        const nextPages = pagesFromTemplate(template.pages);
        const first = nextPages[0];
        updateDraft({ widthMm: template.widthMm, heightMm: template.heightMm });
        setPageSources((current) => {
          releaseAllPageSources(current, (url) => URL.revokeObjectURL(url));
          return {};
        });
        setPages(nextPages);
        setSelectedPageId(first?.id ?? '');
        setSelectedId(null);
        setScreen('print');
      })
      .catch((error: unknown) => {
        const message = formatError(error);
        setStatus(message);
        toast.error(message);
      });
  };

  const commandActions: AppCommandActions = {
    openFile: onOpenDialog,
    saveTemplate: () => {
      setTemplateName(`${Math.round(draft.widthMm)}×${Math.round(draft.heightMm)}`);
      setSaveTemplateOpen(true);
    },
    applyTemplate: applyTemplateById,
    exportDiagnostics: () => {
      if (!window.thermalBridge) {
        return;
      }
      void window.thermalBridge.diagnostics
        .exportBundle()
        .then((path) => {
          setStatus(path);
          toast.success(t('exportedDiagnostics'));
        })
        .catch((error: unknown) => {
          const message = formatError(error);
          setStatus(message);
          toast.error(message);
        });
    },
    duplicate: () => {
      if (!selectedId || selectedId === AWB_IMAGE_ID) {
        return;
      }
      const current = overlays.find((item) => item.id === selectedId);
      if (!current) {
        return;
      }
      addOverlay(duplicateOverlay(current));
    },
    deleteSelected: () => {
      if (!selectedId || !selectedPage) {
        return;
      }
      const nextPage = deleteSelectedFromPage(selectedPage, selectedId, AWB_IMAGE_ID);
      if (!nextPage) {
        return;
      }
      const nextPages = updateLabelPage(pages, selectedPage.id, {
        overlays: nextPage.overlays,
        contentBox: nextPage.contentBox,
        hasSource: nextPage.hasSource,
      });
      setPages(nextPages);
      if (selectedId === AWB_IMAGE_ID) {
        setPageSources((current) =>
          releasePageSource(current, selectedPage.id, (url) => URL.revokeObjectURL(url)),
        );
      }
      setSelectedId(null);
    },
    deselect: () => setSelectedId(null),
    addText: () => addOverlay(createTextOverlay(draft.widthMm, draft.heightMm)),
    addQr: () => addOverlay(createQrOverlay(draft.widthMm, draft.heightMm)),
    addBarcode: () => addOverlay(createBarcodeOverlay(draft.widthMm, draft.heightMm)),
    addRect: () => addOverlay(createRectOverlay(draft.widthMm, draft.heightMm)),
    addLine: () => addOverlay(createLineOverlay(draft.widthMm, draft.heightMm)),
    addCircle: () => addOverlay(createCircleOverlay(draft.widthMm, draft.heightMm)),
    addArrow: () => addOverlay(createArrowOverlay(draft.widthMm, draft.heightMm)),
    addTable: () => addOverlay(createTableOverlay(draft.widthMm, draft.heightMm)),
    addField: () => addOverlay(createFieldOverlay(draft.widthMm, draft.heightMm)),
    setLabelSize: (size) => updateDraft(size),
    addPage: () => {
      if (!selectedPage) {
        return;
      }
      const result = insertLabelPageAfter(pages, selectedPage.id);
      setPages(result.pages);
      setSelectedPageId(result.inserted.id);
      setSelectedId(null);
    },
    duplicatePage: () => {
      if (!selectedPage) {
        return;
      }
      const result = duplicateLabelPage(pages, selectedPage.id);
      setPages(result.pages);
      setSelectedPageId(result.inserted.id);
      const assets = pageSources[selectedPage.id];
      if (assets) {
        setPageSources((current) => ({ ...current, [result.inserted.id]: assets }));
      }
      setSelectedId(null);
    },
    deletePage: () => {
      if (!selectedPage) {
        return;
      }
      const next = removeLabelPage(pages, selectedPage.id);
      setPages(next);
      setPageSources((current) =>
        releasePageSource(current, selectedPage.id, (url) => URL.revokeObjectURL(url)),
      );
      if (selectedPageId === selectedPage.id) {
        const keep = next[0];
        if (keep) {
          setSelectedPageId(keep.id);
        }
      }
      setSelectedId(null);
    },
    setFitMode: (mode: MenuFitMode) => updateDraft({ fitMode: mode }),
    rotateLeft: () =>
      updateDraft({ rotation: ((draft.rotation + 270) % 360) as Rotation }),
    rotateRight: () =>
      updateDraft({ rotation: ((draft.rotation + 90) % 360) as Rotation }),
    enhance: onEnhance,
    revertEnhance: onRevertCleanup,
    print: onPrint,
    testPage: onTest,
    connectPrinter: openConnectPrinter,
    selectPrinter: (id) => {
      const printer = catalog.find((item) => item.id === id);
      if (printer) {
        void bindPrinter(printer);
      }
    },
    selectProfile: (id) => updateDraft({ profileId: id }),
    setScreen,
    toggleGrid: () => setShowGrid((current) => !current),
    setLocale,
  };
  const actionsRef = useRef(commandActions);
  actionsRef.current = commandActions;
  const commandHandlers = useMemo(
    () =>
      createCommandHandlers({
        actions: () => actionsRef.current,
        preview: () => previewRef.current,
      }),
    [],
  );
  const { run } = useCommands(commandHandlers);
  const menuState = useMemo(
    () =>
      buildMenuState({
        screen,
        locale,
        hasSelection: Boolean(selectedId),
        hasSource: selectedPage?.hasSource === true,
        canPrint: !printDisabled,
        isEnhanced: selectedSource?.enhanced === true,
        showGrid,
        fitMode: draft.fitMode,
        pageCount: pages.length,
        modalOpen,
        labelSizes: labelSizesForProfile(profile).map((size) => ({
          widthMm: size.widthMm,
          heightMm: size.heightMm,
          displayName: size.displayName,
        })),
        activeLabelSize: { widthMm: draft.widthMm, heightMm: draft.heightMm },
        printers: catalog.map((printer) => ({ id: printer.id, name: printer.name })),
        activePrinterId: draft.printerId,
        profiles: PROFILES.map((item) => ({ id: item.id, displayName: item.displayName })),
        activeProfileId: draft.profileId,
        templates: templateItems.map((item) => ({ id: item.id, name: item.name })),
      }),
    [
      catalog,
      draft.fitMode,
      draft.heightMm,
      draft.printerId,
      draft.profileId,
      draft.widthMm,
      locale,
      modalOpen,
      pages.length,
      printDisabled,
      profile,
      selectedId,
      selectedPage?.hasSource,
      selectedSource?.enhanced,
      screen,
      showGrid,
      templateItems,
    ],
  );
  useMenuSync(menuState);

  return (
    <div className="flex h-full bg-ink-900">
      <AppSidebar screen={screen} onScreen={setScreen} />

      <main
        className={cn(
          'min-w-0 flex-1',
          screen === 'print' ? 'overflow-hidden p-0' : 'overflow-auto p-4',
        )}
      >
        {screen === 'print' ? (
          <div className="flex h-full min-h-0">
            <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
              <PreviewPane
              ref={previewRef}
              source={source}
              sourceUrl={sourcePreview?.url ?? null}
              sourceUrls={sourceUrlsFromMap(pageSources)}
              pages={pages}
              selectedPageId={selectedPage?.id ?? ''}
              widthMm={draft.widthMm}
              heightMm={draft.heightMm}
              dpi={dpi}
              onContentBox={(box) => {
                if (!selectedPage) {
                  return;
                }
                setPages((current) => updateLabelPage(current, selectedPage.id, { contentBox: box }));
              }}
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
                const assets = pageSources[id];
                if (assets) {
                  setPageSources((current) => ({ ...current, [result.inserted.id]: assets }));
                }
                setSelectedId(null);
              }}
              onDeletePage={(id) => {
                const next = removeLabelPage(pages, id);
                setPages(next);
                setPageSources((current) =>
                  releasePageSource(current, id, (url) => URL.revokeObjectURL(url)),
                );
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
              onAddIcon={(iconId) => addOverlay(createIconOverlay(draft.widthMm, draft.heightMm, iconId))}
              onAddImage={(src, naturalWidth, naturalHeight) =>
                addOverlay(
                  createImageOverlay(draft.widthMm, draft.heightMm, src, naturalWidth, naturalHeight),
                )
              }
              run={run}
              showGrid={showGrid}
              sourcePages={pages.flatMap((page) => {
                const assets = pageSources[page.id];
                if (!assets) {
                  return [];
                }
                return [
                  {
                    pageId: page.id,
                    mimeType: assets.document.mimeType,
                    pageNumber: assets.document.pageNumber,
                    pageCount: assets.document.pageCount,
                    previewUrl: assets.previewUrl,
                    name: assets.document.name,
                  },
                ];
              })}
              onConnectPrinter={openConnectPrinter}
              onLabelSize={(size) => updateDraft(size)}
              onFile={onFile}
              onOpenDialog={onOpenDialog}
              showSourcePagePicker={pages.length <= 1}
              onPageChange={(pageNumber) => {
                if (!selectedPage) {
                  return;
                }
                const assets = pageSources[selectedPage.id];
                if (!assets) {
                  return;
                }
                void materializePageSource(selectedPage.id, {
                  ...assets.document,
                  pageNumber,
                }).catch((error: unknown) => {
                  const message = formatError(error);
                  setStatus(message);
                  toast.error(message);
                });
              }}
              onPrint={onPrint}
              onSaveTemplate={() => {
                setTemplateName(`${Math.round(draft.widthMm)}×${Math.round(draft.heightMm)}`);
                setSaveTemplateOpen(true);
              }}
              showCleanupBanner={
                selectedSource?.enhanced === true &&
                selectedPage !== undefined &&
                !cleanupBannerDismissed.has(selectedPage.id) &&
                profileColorModel(profile) !== 'inkjet-cmyk'
              }
              onRevertCleanup={onRevertCleanup}
              onDismissCleanup={onDismissCleanup}
              printerName={selectedPrinter?.name ?? null}
              linkState={linkState}
              printDisabled={printDisabled}
              busy={busy}
              shortcutsEnabled={!modalOpen}
              labelSizes={labelSizesForProfile(profile)}
              />
            </div>
            <WorkspaceRightPane
              hasInspector={selectedOverlay !== undefined && selectedId !== AWB_IMAGE_ID}
              inspector={
                selectedOverlay && selectedId !== AWB_IMAGE_ID ? (
                  <EditorInspector
                    overlay={selectedOverlay}
                    selectedId={selectedId}
                    labelWidthMm={draft.widthMm}
                    labelHeightMm={draft.heightMm}
                    onChange={(id, patch) =>
                      patchSelectedOverlays((current) =>
                        current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
                      )
                    }
                    onCenter={() => {
                      patchSelectedOverlays((current) =>
                        current.map((item) =>
                          item.id === selectedOverlay.id
                            ? { ...item, ...centerOverlay(item, draft.widthMm, draft.heightMm) }
                            : item,
                        ),
                      );
                    }}
                    onCenterH={() => {
                      patchSelectedOverlays((current) =>
                        current.map((item) =>
                          item.id === selectedOverlay.id
                            ? { ...item, ...centerOverlayH(item, draft.widthMm) }
                            : item,
                        ),
                      );
                    }}
                    onCenterV={() => {
                      patchSelectedOverlays((current) =>
                        current.map((item) =>
                          item.id === selectedOverlay.id
                            ? { ...item, ...centerOverlayV(item, draft.heightMm) }
                            : item,
                        ),
                      );
                    }}
                    onZOrder={(direction) => {
                      patchSelectedOverlays((current) =>
                        moveOverlayZ(current, selectedOverlay.id, direction),
                      );
                    }}
                  />
                ) : null
              }
              print={
                <PrintPane
                  draft={draft}
                  printers={catalog}
                  linkState={linkState}
                  busy={busy}
                  status={status}
                  onChange={updateDraft}
                  onTest={onTest}
                  fitMode={draft.fitMode}
                  rotation={draft.rotation}
                  hasSource={selectedPage?.hasSource === true}
                  sourceIsPdf={selectedSource?.document.mimeType === 'application/pdf'}
                  isEnhanced={selectedSource?.enhanced === true}
                  contentScalePercent={contentScalePercent}
                  contentScaleMin={CONTENT_SCALE_MIN}
                  contentScaleMax={CONTENT_SCALE_MAX}
                  onFitMode={(fitMode) => updateDraft({ fitMode })}
                  onRotation={(rotation) => updateDraft({ rotation })}
                  onContentScale={onContentScale}
                  onEnhance={onEnhance}
                  onRevertEnhance={onRevertCleanup}
                />
              }
            />
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
        {screen === 'history' ? (
          <HistoryPane
            items={historyItems}
            busy={busy}
            onPrintAgain={reprintHistory}
            onOpen={openHistory}
            onDelete={(id) => {
              void window.thermalBridge.library.removeHistory(id).then(() => {
                setHistoryItems((current) => current.filter((item) => item.id !== id));
              });
            }}
          />
        ) : null}
        {screen === 'library' ? (
          <LibraryPane
            items={mediaItems}
            templates={templateItems}
            onOpen={openMedia}
            onDelete={(id) => {
              void window.thermalBridge.library.removeMedia(id).then(() => {
                setMediaItems((current) => current.filter((item) => item.id !== id));
              });
            }}
            onApplyTemplate={applyTemplateById}
            onDeleteTemplate={(id) => {
              void window.thermalBridge.library.removeTemplate(id).then(() => {
                setTemplateItems((current) => current.filter((item) => item.id !== id));
              });
            }}
          />
        ) : null}
      </main>
      <SaveTemplateDialog
        open={saveTemplateOpen}
        name={templateName}
        onNameChange={setTemplateName}
        onClose={() => setSaveTemplateOpen(false)}
        onSave={() => {
          const name = templateName.trim();
          if (name.length === 0) {
            return;
          }
          void window.thermalBridge.library
            .saveTemplate({
              name,
              widthMm: draft.widthMm,
              heightMm: draft.heightMm,
              pages: templatePagesFromLabel(pages),
            })
            .then((saved) => {
              setTemplateItems((current) => {
                const without = current.filter((item) => item.id !== saved.id);
                return [
                  {
                    id: saved.id,
                    name: saved.name,
                    createdAt: saved.createdAt,
                    updatedAt: saved.updatedAt,
                    widthMm: saved.widthMm,
                    heightMm: saved.heightMm,
                    pageCount: saved.pages.length,
                  },
                  ...without,
                ];
              });
              setSaveTemplateOpen(false);
              setStatus(t('templatesSaved'));
              toast.success(t('templatesSaved'));
            })
            .catch((error: unknown) => {
              const message = formatError(error);
              setStatus(message);
              toast.error(message);
            });
        }}
      />
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

function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const copy = document.createElement('canvas');
  copy.width = source.width;
  copy.height = source.height;
  const ctx = copy.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable');
  }
  ctx.drawImage(source, 0, 0);
  return copy;
}

function upscaleToPrintFit(
  source: HTMLCanvasElement,
  widthMm: number,
  heightMm: number,
  dpi: number,
): HTMLCanvasElement {
  const fit = computeFitRect(
    source.width,
    source.height,
    mmToDots(widthMm, dpi),
    mmToDots(heightMm, dpi),
    'fit',
  );
  const targetW = Math.max(source.width, fit.width);
  const targetH = Math.max(source.height, fit.height);
  if (targetW === source.width && targetH === source.height) {
    return cloneCanvas(source);
  }
  const out = document.createElement('canvas');
  out.width = targetW;
  out.height = targetH;
  const ctx = out.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable');
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, targetW, targetH);
  return out;
}

async function composePageBitmap(options: {
  source: HTMLCanvasElement | null;
  page: LabelPage;
  widthMm: number;
  heightMm: number;
  dpi: number;
  fitMode: PrintDraft['fitMode'];
  copyIndex?: number;
}): Promise<{ width: number; height: number; rgba: Uint8Array; canvas: HTMLCanvasElement } | null> {
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
  await drawOverlays(ctx, options.page.overlays, options.dpi, {
    copyIndex: options.copyIndex ?? 0,
    widthMm: options.widthMm,
    heightMm: options.heightMm,
  });
  return {
    width: composed.width,
    height: composed.height,
    rgba: new Uint8Array(ctx.getImageData(0, 0, composed.width, composed.height).data),
    canvas: composed.canvas,
  };
}
