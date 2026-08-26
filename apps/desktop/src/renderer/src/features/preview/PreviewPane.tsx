import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import type { FitMode, Rotation } from '@thermalbridge/thermal-core';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js';
import { Slider } from '@/components/ui/slider.js';
import { EditorDock } from '@/features/editor/EditorDock.js';
import { EditorInspector } from '@/features/editor/EditorInspector.js';
import { EditorPageStack } from '@/features/editor/EditorPageStack.js';
import { EditorPalette } from '@/features/editor/EditorPalette.js';
import { EditorTopChrome } from '@/features/editor/EditorTopChrome.js';
import { AWB_IMAGE_ID } from '@/features/editor/LabelCanvas.js';
import type { LabelPage } from '@/features/editor/label-pages.js';
import type { OverlayElement } from '@/features/editor/overlay.js';
import { useEditorShortcuts } from '@/features/editor/use-editor-shortcuts.js';
import type { LinkState } from '@/features/printers/connection-status.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import { cn } from '@/lib/utils.js';
import type { SourceDocument } from '@/state/types.js';
import {
  CONTENT_SCALE_MAX,
  CONTENT_SCALE_MIN,
  boxFromFit,
  contentOverflowMm,
  scaleBoxToPercent,
  scalePercentFromBox,
  type ContentBox,
} from './content-placement.js';
import {
  PREVIEW_ZOOM_DEFAULT,
  PREVIEW_ZOOM_MAX,
  PREVIEW_ZOOM_MIN,
  clampPreviewZoom,
  nextWellSize,
  previewDocumentSize,
  previewLabelSize,
} from './preview-zoom.js';

interface PreviewPaneProps {
  source: SourceDocument | null;
  sourceUrl: string | null;
  sourceWidthPx: number;
  sourceHeightPx: number;
  pages: LabelPage[];
  selectedPageId: string;
  selectedId: string | null;
  widthMm: number;
  heightMm: number;
  dpi: number;
  fitMode: FitMode;
  rotation: Rotation;
  printerName: string | null;
  linkState: LinkState;
  printDisabled: boolean;
  busy: boolean;
  onContentBox: (box: ContentBox) => void;
  onFitMode: (mode: FitMode) => void;
  onRotation: (rotation: Rotation) => void;
  onSelect: (id: string | null) => void;
  onOverlayChange: (id: string, patch: Partial<OverlayElement>) => void;
  onAddText: () => void;
  onAddQr: () => void;
  onAddBarcode: () => void;
  onAddRect: () => void;
  onAddLine: () => void;
  onAddImage: (src: string, naturalWidth: number, naturalHeight: number) => void;
  onDuplicate: () => void;
  onDeleteSelected: () => void;
  onCenter: () => void;
  onCenterH: () => void;
  onCenterV: () => void;
  onZOrder: (direction: 'up' | 'down') => void;
  onSelectPage: (id: string) => void;
  onAddPageAfter: (id: string) => void;
  onDuplicatePage: (id: string) => void;
  onDeletePage: (id: string) => void;
  onConnectPrinter: () => void;
  onLabelSize: (size: { widthMm: number; heightMm: number }) => void;
  onFile: (file: File) => void;
  onOpenDialog: () => void;
  onPageChange: (page: number) => void;
  onPrint: () => void;
  shortcutsEnabled: boolean;
}

const FIT_MODES: FitMode[] = ['fit', 'fill', 'actual', 'stretch'];
const ROTATIONS: Rotation[] = [0, 90, 180, 270];
const ZOOM_STEP = 5;

export function PreviewPane(props: PreviewPaneProps) {
  const { t } = useI18n();
  const wellRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [wellSize, setWellSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(PREVIEW_ZOOM_DEFAULT);
  const [showGrid, setShowGrid] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const selectedPage =
    props.pages.find((page) => page.id === props.selectedPageId) ?? props.pages[0] ?? null;
  const contentBox = selectedPage?.contentBox ?? null;
  const selectedOverlay = selectedPage?.overlays.find((item) => item.id === props.selectedId) ?? null;
  const pickImage = (): void => {
    imageInputRef.current?.click();
  };
  const fitLabel: Record<FitMode, string> = {
    fit: t('fitFit'),
    fill: t('fitFill'),
    actual: t('fitActual'),
    stretch: t('fitStretch'),
  };
  const inset = 32;
  const labelSize = previewLabelSize({
    wellWidth: Math.max(0, wellSize.width - inset),
    wellHeight: Math.max(0, wellSize.height - inset),
    widthMm: props.widthMm,
    heightMm: props.heightMm,
    zoomPercent: zoom,
  });
  const measured = wellSize.width > 0 && wellSize.height > 0;
  const overflow = contentBox
    ? contentOverflowMm(contentBox, props.widthMm, props.heightMm)
    : { leftMm: 0, topMm: 0, rightMm: 0, bottomMm: 0 };
  const overflowPad = measured
    ? Math.max(
        ((overflow.leftMm + overflow.rightMm) / props.widthMm) * labelSize.width,
        ((overflow.topMm + overflow.bottomMm) / props.heightMm) * labelSize.height,
      ) + 16
    : 16;
  const documentSize = measured
    ? previewDocumentSize({
        wellWidth: wellSize.width,
        wellHeight: wellSize.height,
        pageWidth: labelSize.width,
        pageHeight: labelSize.height,
        pageCount: props.pages.length,
        gutter: 56,
        padding: 64 + overflowPad,
        footer: 0,
      })
    : null;
  const fitBox = useMemo(() => {
    if (props.sourceWidthPx <= 0 || props.sourceHeightPx <= 0) {
      return null;
    }
    return boxFromFit({
      sourceWidthPx: props.sourceWidthPx,
      sourceHeightPx: props.sourceHeightPx,
      labelWidthMm: props.widthMm,
      labelHeightMm: props.heightMm,
      dpi: props.dpi,
      fitMode: props.fitMode,
    });
  }, [
    props.sourceWidthPx,
    props.sourceHeightPx,
    props.widthMm,
    props.heightMm,
    props.dpi,
    props.fitMode,
  ]);
  const scalePercent =
    contentBox && fitBox ? scalePercentFromBox(contentBox, fitBox) : 100;

  useEffect(() => {
    const preventWindowFileOpen = (event: Event): void => {
      event.preventDefault();
    };
    window.addEventListener('dragover', preventWindowFileOpen);
    window.addEventListener('drop', preventWindowFileOpen);
    return () => {
      window.removeEventListener('dragover', preventWindowFileOpen);
      window.removeEventListener('drop', preventWindowFileOpen);
    };
  }, []);

  useEffect(() => {
    const well = wellRef.current;
    if (!well) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      setWellSize((current) =>
        nextWellSize(current, entry.contentRect.width, entry.contentRect.height),
      );
    });
    observer.observe(well);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const well = wellRef.current;
    if (!well) {
      return;
    }
    const onWheel = (event: WheelEvent): void => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      event.preventDefault();
      const step = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((current) => clampPreviewZoom(current + step));
    };
    well.addEventListener('wheel', onWheel, { passive: false });
    return () => well.removeEventListener('wheel', onWheel);
  }, []);

  const nudgeZoom = (delta: number): void => {
    setZoom((current) => clampPreviewZoom(current + delta));
  };

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      props.onFile(file);
    }
  };

  useEditorShortcuts({
    enabled: props.shortcutsEnabled && !paletteOpen,
    onAddText: props.onAddText,
    onAddQr: props.onAddQr,
    onAddBarcode: props.onAddBarcode,
    onAddRect: props.onAddRect,
    onAddLine: props.onAddLine,
    onAddImage: pickImage,
    onDuplicate: props.onDuplicate,
    onDeleteSelected: props.onDeleteSelected,
    onToggleGrid: () => setShowGrid((current) => !current),
    onOpenPalette: () => setPaletteOpen(true),
    onEscape: () => {
      setPaletteOpen(false);
      props.onSelect(null);
    },
  });

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink-900">
      <EditorTopChrome
        source={props.source}
        zoom={zoom}
        showGrid={showGrid}
        widthMm={props.widthMm}
        heightMm={props.heightMm}
        printerName={props.printerName}
        linkState={props.linkState}
        printDisabled={props.printDisabled}
        busy={props.busy}
        onOpenFile={props.onOpenDialog}
        onPageChange={props.onPageChange}
        onOpenPalette={() => setPaletteOpen(true)}
        onZoomIn={() => nudgeZoom(ZOOM_STEP)}
        onZoomOut={() => nudgeZoom(-ZOOM_STEP)}
        onZoomReset={() => setZoom(PREVIEW_ZOOM_DEFAULT)}
        onToggleGrid={() => setShowGrid((current) => !current)}
        onLabelSize={props.onLabelSize}
        onConnectPrinter={props.onConnectPrinter}
        onPrint={props.onPrint}
      />
      <div className="relative min-h-0 flex-1">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) {
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              const src = typeof reader.result === 'string' ? reader.result : '';
              if (!src) {
                return;
              }
              const image = new Image();
              image.onload = () => {
                props.onAddImage(src, image.naturalWidth, image.naturalHeight);
              };
              image.src = src;
            };
            reader.readAsDataURL(file);
          }}
        />
        <div
          ref={wellRef}
          tabIndex={0}
          className={cn(
            'canvas-grid h-full min-h-0 overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            dragOver && 'ring-2 ring-primary/50',
          )}
          aria-label={t('previewTitle')}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div
            className="flex justify-center"
            style={documentSize ?? { minHeight: '100%', minWidth: '100%' }}
          >
            <EditorPageStack
              pages={props.pages}
              selectedPageId={selectedPage?.id ?? props.selectedPageId}
              selectedId={props.selectedId}
              sourceUrl={props.sourceUrl}
              widthMm={props.widthMm}
              heightMm={props.heightMm}
              pageWidth={labelSize.width}
              pageHeight={labelSize.height}
              measured={measured}
              showGrid={showGrid}
              onSelectPage={props.onSelectPage}
              onSelect={props.onSelect}
              onContentBox={props.onContentBox}
              onOverlayChange={props.onOverlayChange}
              onAddPageAfter={props.onAddPageAfter}
              onDuplicatePage={props.onDuplicatePage}
              onDeletePage={props.onDeletePage}
            />
          </div>
        </div>
        <EditorDock
          selectedId={props.selectedId && props.selectedId !== AWB_IMAGE_ID ? props.selectedId : null}
          showGrid={showGrid}
          onAddText={props.onAddText}
          onAddQr={props.onAddQr}
          onAddBarcode={props.onAddBarcode}
          onAddRect={props.onAddRect}
          onAddLine={props.onAddLine}
          onAddImage={pickImage}
          onDuplicate={props.onDuplicate}
          onDeleteSelected={props.onDeleteSelected}
          onToggleGrid={() => setShowGrid((current) => !current)}
        />
        {selectedOverlay ? (
          <div className="absolute top-3 right-[19.25rem] z-20 w-72 max-h-[calc(100%-1.5rem)] overflow-auto rounded-2xl border border-white/5 bg-ink-800/95 p-3 shadow-panel backdrop-blur-md">
            <EditorInspector
              overlay={selectedOverlay}
              selectedId={props.selectedId}
              onChange={props.onOverlayChange}
              onCenter={props.onCenter}
              onCenterH={props.onCenterH}
              onCenterV={props.onCenterV}
              onZOrder={props.onZOrder}
            />
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 px-3 pb-3 pl-[5.75rem] pr-[19.25rem]">
          <p className="pointer-events-none text-ui-2xs text-ink-500">
            {t('shortcutZoom')}
            <span className="mx-1.5">·</span>
            {t('shortcutPalette')}
            <span className="mx-1.5">·</span>
            {props.widthMm} × {props.heightMm} mm
            <span className="mx-1.5">·</span>
            {props.dpi} DPI
          </p>
          <div className="pointer-events-auto flex max-w-xl items-center gap-2 rounded-xl border border-white/5 bg-ink-800/90 px-2 py-1.5 shadow-panel backdrop-blur-md">
            {contentBox && fitBox && selectedPage?.hasSource ? (
              <>
                <span className="shrink-0 text-ui-2xs text-ink-400">{t('contentSize')}</span>
                <Slider
                  min={CONTENT_SCALE_MIN}
                  max={CONTENT_SCALE_MAX}
                  step={1}
                  value={[scalePercent]}
                  aria-label={t('contentSize')}
                  className="w-24"
                  onValueChange={(value) => {
                    if (!contentBox || !fitBox) {
                      return;
                    }
                    props.onContentBox(
                      scaleBoxToPercent(contentBox, fitBox, value[0] ?? 100),
                    );
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    if (fitBox) {
                      props.onContentBox(fitBox);
                    }
                  }}
                >
                  {t('contentReset')}
                </Button>
              </>
            ) : null}
            <Select
              value={props.fitMode}
              onValueChange={(value) => props.onFitMode(value as FitMode)}
            >
              <SelectTrigger size="sm" className="h-7 w-[6.5rem] border-white/5 bg-ink-750">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIT_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {fitLabel[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(props.rotation)}
              onValueChange={(value) => props.onRotation(Number(value) as Rotation)}
            >
              <SelectTrigger size="sm" className="h-7 w-[4.5rem] border-white/5 bg-ink-750">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROTATIONS.map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value}°
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t('zoomOut')}
              disabled={zoom <= PREVIEW_ZOOM_MIN}
              onClick={() => nudgeZoom(-ZOOM_STEP)}
            >
              <Minus />
            </Button>
            <span className="w-10 text-center font-mono text-ui-2xs tabular-nums text-ink-300">
              {zoom}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t('zoomIn')}
              disabled={zoom >= PREVIEW_ZOOM_MAX}
              onClick={() => nudgeZoom(ZOOM_STEP)}
            >
              <Plus />
            </Button>
          </div>
        </div>
      </div>
      <EditorPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onAddText={props.onAddText}
        onAddQr={props.onAddQr}
        onAddBarcode={props.onAddBarcode}
        onAddRect={props.onAddRect}
        onAddLine={props.onAddLine}
        onAddImage={pickImage}
        onDuplicate={props.onDuplicate}
        onDeleteSelected={props.onDeleteSelected}
        onToggleGrid={() => setShowGrid((current) => !current)}
      />
    </div>
  );
}
