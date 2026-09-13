import type { LabelSize } from '@thermalbridge/printer-profiles';
import { FileUp, LayoutTemplate, Printer } from 'lucide-react';
import { LabelSizeSelect } from '@/features/preview/LabelSizeSelect.js';
import type { LinkState } from '@/features/printers/connection-status.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import { cn } from '@/lib/utils.js';
import type { SourceDocument } from '@/state/types.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js';

interface EditorTopChromeProps {
  source: SourceDocument | null;
  widthMm: number;
  heightMm: number;
  printerName: string | null;
  linkState: LinkState;
  printDisabled: boolean;
  busy: boolean;
  onOpenFile: () => void;
  onPageChange: (page: number) => void;
  showPagePicker?: boolean;
  onLabelSize: (size: { widthMm: number; heightMm: number }) => void;
  onConnectPrinter: () => void;
  onPrint: () => void;
  onSaveTemplate: () => void;
  labelSizes?: readonly LabelSize[];
}

export function EditorTopChrome(props: EditorTopChromeProps) {
  const { t } = useI18n();
  const source = props.source;

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/5 bg-ink-900 px-3">
      <button
        type="button"
        onClick={props.onOpenFile}
        className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-white/5 bg-ink-800 px-2.5 text-ui-sm text-ink-200 hover:bg-ink-750 hover:text-ink-50 hover-fade"
        title={t('addFile')}
      >
        <FileUp className="size-3.5 shrink-0 text-ink-400" />
        <span className="min-w-0 truncate">{source?.name ?? t('addFile')}</span>
      </button>
      {source !== null && source.pageCount > 1 && props.showPagePicker !== false ? (
        <Select
          value={String(source.pageNumber)}
          onValueChange={(value) => props.onPageChange(Number(value))}
        >
          <SelectTrigger size="sm" className="h-8 w-[5.5rem] shrink-0 border-white/5 bg-ink-800">
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

      <div className="min-w-0 flex-1">
        <LabelSizeSelect
          variant="inline"
          widthMm={props.widthMm}
          heightMm={props.heightMm}
          onChange={props.onLabelSize}
          className="w-full"
          {...(props.labelSizes !== undefined ? { sizes: props.labelSizes } : {})}
        />
      </div>

      <button
        type="button"
        onClick={props.onSaveTemplate}
        className="flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md border border-white/5 bg-ink-800 px-2.5 text-ui-sm text-ink-200 hover:bg-ink-750 hover:text-ink-50 hover-fade"
        title={t('templatesSave')}
      >
        <LayoutTemplate className="size-3.5 shrink-0 text-ink-400" />
        <span className="min-w-0 truncate">{t('templatesSave')}</span>
      </button>

      <button
        type="button"
        onClick={props.onConnectPrinter}
        className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-white/5 bg-ink-800 px-2.5 text-ui-sm text-ink-200 hover:bg-ink-750 hover:text-ink-50 hover-fade"
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
        className="flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-ui-sm font-medium text-on-accent hover:bg-accent-600 hover-fade disabled:opacity-50"
      >
        <Printer className="size-3.5" />
        <span className="min-w-0 truncate">{props.busy ? t('printing') : t('print')}</span>
      </button>
    </header>
  );
}
