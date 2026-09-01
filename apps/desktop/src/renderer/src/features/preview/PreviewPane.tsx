import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactElement } from 'react';
import type { LabelSize } from '@thermalbridge/printer-profiles';
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
import { EditorIconPicker } from '@/features/editor/EditorIconPicker.js';
import { EditorPageStack } from '@/features/editor/EditorPageStack.js';
import { EditorPalette } from '@/features/editor/EditorPalette.js';
import { EditorTopChrome } from '@/features/editor/EditorTopChrome.js';
import type { LabelPage } from '@/features/editor/label-pages.js';
import type { OverlayElement } from '@/features/editor/overlay.js';
import { normalizeImportedImage } from '@/features/editor/svg-source.js';
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
  previewVisibleWell,
} from './preview-zoom.js';

interface PreviewPaneProps {
  source: SourceDocument | null;
  sourceUrl: string | null;
  sourceUrls: Readonly<Record<string, string>>;
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
  onAddCircle: () => void;
  onAddArrow: () => void;
  onAddIcon: (iconId: string) => void;
  onAddImage: (src: string, naturalWidth: number, naturalHeight: number) => void;
  onAddTable: () => void;
  onAddField: () => void;
  onDuplicate: () => void;
  onDeleteSelected: () => void;
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
  onSaveTemplate: () => void;
  shortcutsEnabled: boolean;
  labelSizes?: readonly LabelSize[];
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
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const selectedPage =
    props.pages.find((page) => page.id === props.selectedPageId) ?? props.pages[0] ?? null;
  const contentBox = selectedPage?.contentBox ?? null;
  const pickImage = (): void => {
    imageInputRef.current?.click();
  };
  const fitLabel: Record<FitMode, string> = {
    fit: t('fitFit'),
    fill: t('fitFill'),
    actual: t('fitActual'),
    stretch: t('fitStretch'),
  };
  const visibleWell = previewVisibleWell(wellSize.width, wellSize.height);
  const labelSize = previewLabelSize({
    wellWidth: visibleWell.width,
    wellHeight: visibleWell.height,
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
    enabled: props.shortcutsEnabled && !paletteOpen && !iconPickerOpen,
    onAddText: props.onAddText,
    onAddQr: props.onAddQr,
    onAddBarcode: props.onAddBarcode,
    onAddRect: props.onAddRect,
    onAddLine: props.onAddLine,
    onAddCircle: props.onAddCircle,
    onAddArrow: props.onAddArrow,
    onAddIcon: () => setIconPickerOpen(true),
    onAddImage: pickImage,
    onAddTable: props.onAddTable,
    onAddField: props.onAddField,
    onDuplicate: props.onDuplicate,
    onDeleteSelected: props.onDeleteSelected,
    onToggleGrid: () => setShowGrid((current) => !current),
    onOpenPalette: () => setPaletteOpen(true),
    onEscape: () => {
      setPaletteOpen(false);
      setIconPickerOpen(false);
      props.onSelect(null);
    },
  });

  const dock = (orientation: 'vertical' | 'horizontal'): ReactElement => (
    <EditorDock
      orientation={orientation}
      selectedId={props.selectedId}
      showGrid={showGrid}
      onAddText={props.onAddText}
      onAddQr={props.onAddQr}
      onAddBarcode={props.onAddBarcode}
      onAddRect={props.onAddRect}
      onAddLine={props.onAddLine}
      onAddCircle={props.onAddCircle}
      onAddArrow={props.onAddArrow}
      onAddIcon={() => setIconPickerOpen(true)}
      onAddImage={pickImage}
      onAddTable={props.onAddTable}
      onAddField={props.onAddField}
      onDuplicate={props.onDuplicate}
      onDeleteSelected={props.onDeleteSelected}
      onToggleGrid={() => setShowGrid((current) => !current)}
    />
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink-900">
      <EditorTopChrome
        source={props.source}
        widthMm={props.widthMm}
        heightMm={props.heightMm}
        printerName={props.printerName}
        linkState={props.linkState}
        printDisabled={props.printDisabled}
        busy={props.busy}
        onOpenFile={props.onOpenDialog}
        onPageChange={props.onPageChange}
        onOpenPalette={() => setPaletteOpen(true)}
        onLabelSize={props.onLabelSize}
        onConnectPrinter={props.onConnectPrinter}
        onPrint={props.onPrint}
        onSaveTemplate={props.onSaveTemplate}
        {...(props.labelSizes !== undefined ? { labelSizes: props.labelSizes } : {})}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
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
                const imported = normalizeImportedImage(src, image);
                props.onAddImage(imported.src, imported.width, imported.height);
              };
              image.src = src;
            };
            reader.readAsDataURL(file);
          }}
        />
        <div className="lg:hidden">{dock('horizontal')}</div>
        <div className="flex min-h-0 flex-1">
          <div className="hidden h-full lg:flex">{dock('vertical')}</div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div
              ref={wellRef}
              tabIndex={0}
              className={cn(
                'canvas-grid min-h-0 flex-1 overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
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
                  sourceUrls={props.sourceUrls}
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
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/5 bg-ink-900 px-3 py-1.5">
              <p className="min-w-0 truncate text-ui-2xs text-ink-500">
                {t('shortcutZoom')}
                <span className="mx-1.5">·</span>
                {t('shortcutPalette')}
                <span className="mx-1.5">·</span>
                {props.widthMm} × {props.heightMm} mm
                <span className="mx-1.5">·</span>
                {props.dpi} DPI
              </p>
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
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
        onAddCircle={props.onAddCircle}
        onAddArrow={props.onAddArrow}
        onAddIcon={() => setIconPickerOpen(true)}
        onAddImage={pickImage}
        onAddTable={props.onAddTable}
        onAddField={props.onAddField}
        onDuplicate={props.onDuplicate}
        onDeleteSelected={props.onDeleteSelected}
        onToggleGrid={() => setShowGrid((current) => !current)}
      />
      <EditorIconPicker
        open={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        onPick={props.onAddIcon}
      />
    </div>
  );
}
