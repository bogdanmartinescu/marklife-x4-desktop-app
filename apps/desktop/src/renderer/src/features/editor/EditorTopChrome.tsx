import { FileUp, Grid3x3, Minus, Plus, Printer, Search } from 'lucide-react';
import { LabelSizeSelect } from '@/features/preview/LabelSizeSelect.js';
import type { LinkState } from '@/features/printers/connection-status.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import { cn } from '@/lib/utils.js';
import type { SourceDocument } from '@/state/types.js';
import {
  PREVIEW_ZOOM_MAX,
  PREVIEW_ZOOM_MIN,
} from '@/features/preview/preview-zoom.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js';

interface EditorTopChromeProps {
  source: SourceDocument | null;
  zoom: number;
  showGrid: boolean;
  widthMm: number;
  heightMm: number;
  printerName: string | null;
  linkState: LinkState;
  printDisabled: boolean;
  busy: boolean;
  onOpenFile: () => void;
  onPageChange: (page: number) => void;
  onOpenPalette: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onToggleGrid: () => void;
  onLabelSize: (size: { widthMm: number; heightMm: number }) => void;
  onConnectPrinter: () => void;
  onPrint: () => void;
}

export function EditorTopChrome(props: EditorTopChromeProps) {
  const { t } = useI18n();
  const viewBtn = (active: boolean): string =>
    cn(
      'flex size-8 items-center justify-center rounded-md border hover-fade',
      active
        ? 'border-primary/30 bg-primary/10 text-primary'
        : 'border-white/5 bg-ink-800 text-ink-300 hover:text-ink-100',
    );

  const source = props.source;

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/5 bg-ink-900 px-3">
      <button
        type="button"
        onClick={props.onOpenFile}
        className="flex h-8 max-w-[13rem] items-center gap-2 rounded-md border border-white/5 bg-ink-800 px-2.5 text-ui-sm text-ink-200 hover:bg-ink-750 hover:text-ink-50 hover-fade"
        title={t('addFile')}
      >
        <FileUp className="size-3.5 shrink-0 text-ink-400" />
        <span className="min-w-0 truncate">
          {source?.name ?? t('addFile')}
        </span>
      </button>
      {source !== null && source.pageCount > 1 ? (
        <Select
          value={String(source.pageNumber)}
          onValueChange={(value) => props.onPageChange(Number(value))}
        >
          <SelectTrigger size="sm" className="h-8 w-[5.5rem] border-white/5 bg-ink-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: source.pageCount }, (_, index) => (
              <SelectItem key={index + 1} value={String(index + 1)}>
                {index + 1}/{source.pageCount}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <button
        type="button"
        onClick={props.onOpenPalette}
        className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-white/5 bg-ink-800 px-2.5 text-ink-400 hover:bg-ink-750 hover:text-ink-100 hover-fade"
      >
        <Search className="size-3.5 shrink-0" />
        <span className="min-w-0 truncate text-ui-sm">{t('editorSearchCommands')}</span>
        <kbd className="ml-auto hidden sm:inline-flex">⌘K</kbd>
      </button>

      <LabelSizeSelect
        variant="inline"
        widthMm={props.widthMm}
        heightMm={props.heightMm}
        onChange={props.onLabelSize}
      />

      <div className="flex h-8 overflow-hidden rounded-md border border-white/5 bg-ink-800">
        <button
          type="button"
          className="flex w-7 items-center justify-center text-ink-300 hover:bg-ink-700 hover:text-ink-50 disabled:opacity-40"
          aria-label={t('zoomOut')}
          disabled={props.zoom <= PREVIEW_ZOOM_MIN}
          onClick={props.onZoomOut}
        >
          <Minus className="size-3.5" />
        </button>
        <button
          type="button"
          title={t('zoomReset')}
          className="min-w-11 px-1 text-center font-mono text-ui-xs tabular-nums text-ink-200 hover:bg-ink-700 hover:text-ink-50"
          onClick={props.onZoomReset}
        >
          {props.zoom}%
        </button>
        <button
          type="button"
          className="flex w-7 items-center justify-center text-ink-300 hover:bg-ink-700 hover:text-ink-50 disabled:opacity-40"
          aria-label={t('zoomIn')}
          disabled={props.zoom >= PREVIEW_ZOOM_MAX}
          onClick={props.onZoomIn}
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      <button
        type="button"
        className={viewBtn(props.showGrid)}
        title={t('editorGrid')}
        onClick={props.onToggleGrid}
      >
        <Grid3x3 className="size-4" />
      </button>

      <button
        type="button"
        onClick={props.onConnectPrinter}
        className="flex h-8 max-w-[12rem] items-center gap-2 rounded-md border border-white/5 bg-ink-800 px-2.5 text-ui-sm text-ink-200 hover:bg-ink-750 hover:text-ink-50 hover-fade"
      >
        <span
          className={cn(
            'size-1.5 shrink-0 rounded-full',
            props.linkState === 'connected' && 'bg-emerald-400',
            props.linkState === 'disconnected' && 'bg-red-400',
            props.linkState === 'unknown' && 'bg-ink-500',
          )}
        />
        <span className="min-w-0 truncate">{props.printerName ?? t('connectPrinter')}</span>
      </button>

      <button
        type="button"
        disabled={props.printDisabled}
        onClick={props.onPrint}
        className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-ui-sm font-medium text-on-accent hover:bg-accent-600 hover-fade disabled:opacity-50"
      >
        <Printer className="size-3.5" />
        {props.busy ? t('printing') : t('print')}
      </button>
    </header>
  );
}
