import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type DragEvent,
  type ReactElement,
} from 'react';
import type { LabelSize } from '@thermalbridge/printer-profiles';
import type { MenuActionId } from '@thermalbridge/shared';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.js';
import type { PreviewCommandsHandle } from '@/features/commands/command-handlers.js';
import { EditorDock } from '@/features/editor/EditorDock.js';
import { EditorIconPicker } from '@/features/editor/EditorIconPicker.js';
import { EditorPageStack } from '@/features/editor/EditorPageStack.js';
import { EditorPalette } from '@/features/editor/EditorPalette.js';
import { EditorTopChrome } from '@/features/editor/EditorTopChrome.js';
import { PhotoCleanupBanner } from '@/features/preview/PhotoCleanupBanner.js';
import { SourceFilmstrip } from '@/features/preview/SourceFilmstrip.js';
import { sourceFilmstripItems, type SourceFilmstripInput } from '@/features/preview/source-filmstrip.js';
import type { LabelPage } from '@/features/editor/label-pages.js';
import type { OverlayElement } from '@/features/editor/overlay.js';
import { normalizeImportedImage } from '@/features/editor/svg-source.js';
import { useEditorShortcuts } from '@/features/editor/use-editor-shortcuts.js';
import type { LinkState } from '@/features/printers/connection-status.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import { cn } from '@/lib/utils.js';
import type { SourceDocument } from '@/state/types.js';
import { contentOverflowMm, type ContentBox } from './content-placement.js';
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
  pages: LabelPage[];
  selectedPageId: string;
  selectedId: string | null;
  widthMm: number;
  heightMm: number;
  dpi: number;
  printerName: string | null;
  linkState: LinkState;
  printDisabled: boolean;
  busy: boolean;
  onContentBox: (box: ContentBox) => void;
  onSelect: (id: string | null) => void;
  onOverlayChange: (id: string, patch: Partial<OverlayElement>) => void;
  onAddIcon: (iconId: string) => void;
  onAddImage: (src: string, naturalWidth: number, naturalHeight: number) => void;
  run: (id: MenuActionId, payload?: unknown) => void;
  showGrid: boolean;
  showRuler: boolean | undefined;
  onSelectPage: (id: string) => void;
  onAddPageAfter: (id: string) => void;
  onDuplicatePage: (id: string) => void;
  onDeletePage: (id: string) => void;
  onMovePageUp: (id: string) => void;
  onMovePageDown: (id: string) => void;
  onConnectPrinter: () => void;
  onLabelSize: (size: { widthMm: number; heightMm: number }) => void;
  onFile: (file: File) => void;
  onOpenDialog: () => void;
  onPageChange: (page: number) => void;
  showSourcePagePicker?: boolean;
  onPrint: () => void;
  onSaveTemplate: () => void;
  showCleanupBanner?: boolean;
  onRevertCleanup?: () => void;
  onDismissCleanup?: () => void;
  shortcutsEnabled: boolean;
  labelSizes?: readonly LabelSize[];
  sourcePages?: readonly SourceFilmstripInput[];
}

const ZOOM_STEP = 5;

export const PreviewPane = forwardRef<PreviewCommandsHandle, PreviewPaneProps>(function PreviewPane(
  props,
  ref,
) {
  const { t } = useI18n();
  const wellRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const [wellSize, setWellSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(PREVIEW_ZOOM_DEFAULT);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dockPosition, setDockPosition] = useState(() => {
    const stored = localStorage.getItem('editorDockPosition');
    if (stored) {
      try {
        return JSON.parse(stored) as { x: number; y: number };
      } catch {
        return { x: 12, y: 12 };
      }
    }
    return { x: 12, y: 12 };
  });
  const [isDraggingDock, setIsDraggingDock] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0, dockX: 0, dockY: 0 });
  const selectedPage =
    props.pages.find((page) => page.id === props.selectedPageId) ?? props.pages[0] ?? null;
  const contentBox = selectedPage?.contentBox ?? null;
  const filmstrip = sourceFilmstripItems(props.sourcePages ?? []);
  const pickImage = (): void => {
    imageInputRef.current?.click();
  };
  useImperativeHandle(ref, () => ({
    zoomIn: () => setZoom((current) => clampPreviewZoom(current + ZOOM_STEP)),
    zoomOut: () => setZoom((current) => clampPreviewZoom(current - ZOOM_STEP)),
    zoomActual: () => setZoom(PREVIEW_ZOOM_DEFAULT),
    openPalette: () => setPaletteOpen(true),
    openIconPicker: () => setIconPickerOpen(true),
    pickImage,
  }));
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
        gutter: 88,
        padding: 64 + overflowPad,
        footer: 0,
      })
    : null;
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

  const handleDockMouseDown = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]')) return;
    
    event.preventDefault();
    setIsDraggingDock(true);
    dragStartPos.current = {
      x: event.clientX,
      y: event.clientY,
      dockX: dockPosition.x,
      dockY: dockPosition.y,
    };
  };

  useEffect(() => {
    if (!isDraggingDock) return;

    const handleMouseMove = (event: MouseEvent): void => {
      const deltaX = event.clientX - dragStartPos.current.x;
      const deltaY = event.clientY - dragStartPos.current.y;
      const newX = Math.max(0, dragStartPos.current.dockX + deltaX);
      const newY = Math.max(0, dragStartPos.current.dockY + deltaY);
      setDockPosition({ x: newX, y: newY });
    };

    const handleMouseUp = (): void => {
      setIsDraggingDock(false);
      localStorage.setItem('editorDockPosition', JSON.stringify(dockPosition));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingDock, dockPosition]);

  useEditorShortcuts({
    enabled: props.shortcutsEnabled,
    run: props.run,
  });

  const dock = (orientation: 'vertical' | 'horizontal'): ReactElement => {
    return (
      <EditorDock
        orientation={orientation}
        selectedId={props.selectedId}
        showGrid={props.showGrid}
        run={props.run}
      />
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink-900">
      <EditorTopChrome
        source={props.source}
        widthMm={props.widthMm}
        heightMm={props.heightMm}
        printerName={props.printerName}
        linkState={props.linkState}
        onOpenFile={props.onOpenDialog}
        onPageChange={props.onPageChange}
        showPagePicker={props.showSourcePagePicker !== false}
        onLabelSize={props.onLabelSize}
        onConnectPrinter={props.onConnectPrinter}
        onSaveTemplate={props.onSaveTemplate}
        {...(props.labelSizes !== undefined ? { labelSizes: props.labelSizes } : {})}
      />
      {props.showCleanupBanner && props.onRevertCleanup && props.onDismissCleanup ? (
        <PhotoCleanupBanner onRevert={props.onRevertCleanup} onDismiss={props.onDismissCleanup} />
      ) : null}
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
        <div className="relative flex min-h-0 flex-1">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="relative min-h-0 flex-1">
            <div
              ref={wellRef}
              tabIndex={0}
              className={cn(
                'canvas-grid absolute inset-0 overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
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
                className={cn(
                  'flex justify-center pt-28 lg:pt-3 lg:pl-40',
                  filmstrip.length > 0 && 'pr-40',
                )}
                style={
                  documentSize
                    ? { minWidth: documentSize.width, minHeight: documentSize.height }
                    : { minHeight: '100%', minWidth: '100%' }
                }
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
                  showGrid={props.showGrid}
                  showRuler={props.showRuler}
                  onSelectPage={props.onSelectPage}
                  onSelect={props.onSelect}
                  onContentBox={props.onContentBox}
                  onOverlayChange={props.onOverlayChange}
                  onAddPageAfter={props.onAddPageAfter}
                  onDuplicatePage={props.onDuplicatePage}
                  onDeletePage={props.onDeletePage}
                  onMovePageUp={props.onMovePageUp}
                  onMovePageDown={props.onMovePageDown}
                />
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 hidden lg:block">
              <div
                ref={dockRef}
                className="pointer-events-auto absolute max-h-[calc(100%-1.5rem)]"
                style={{
                  left: `${dockPosition.x}px`,
                  top: `${dockPosition.y}px`,
                  cursor: isDraggingDock ? 'grabbing' : 'grab',
                }}
                onMouseDown={handleDockMouseDown}
              >
                {dock('vertical')}
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 lg:hidden">
              <div className="pointer-events-auto px-3 pt-3">{dock('horizontal')}</div>
            </div>
            {filmstrip.length > 0 ? (
              <div className="pointer-events-none absolute top-3 bottom-3 right-3">
                <SourceFilmstrip
                  items={filmstrip}
                  selectedPageId={selectedPage?.id ?? props.selectedPageId}
                  onSelectPage={(pageId) => {
                    props.onSelectPage(pageId);
                    props.onSelect(null);
                  }}
                />
              </div>
            ) : null}
            </div>
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-white/5 bg-ink-900 px-3 py-1.5">
              <p className="min-w-0 flex-1 truncate text-ui-2xs text-ink-500">
                {t('shortcutZoom')}
                <span className="mx-1.5">·</span>
                {t('shortcutPalette')}
                <span className="mx-1.5">·</span>
                {props.widthMm} × {props.heightMm} mm · {props.dpi} DPI
              </p>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
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
                  </TooltipTrigger>
                  <TooltipContent side="top">{t('zoomOut')}</TooltipContent>
                </Tooltip>
                <span className="w-10 text-center font-mono text-ui-2xs tabular-nums text-ink-300">
                  {zoom}%
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
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
                  </TooltipTrigger>
                  <TooltipContent side="top">{t('zoomIn')}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
      <EditorPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        run={props.run}
      />
      <EditorIconPicker
        open={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        onPick={props.onAddIcon}
      />
    </div>
  );
});
