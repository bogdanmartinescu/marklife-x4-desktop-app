import { useEffect, useMemo, useState } from 'react';
import { History, Printer, Search, SquarePen, Trash2 } from 'lucide-react';
import type { PrintHistoryMeta } from '@thermalbridge/shared';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.js';
import { copyToUint8Array } from '@/features/import/source-bytes.js';
import {
  filterHistoryItems,
  formatWhen,
  groupHistoryItems,
} from '@/features/library/print-history.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import type { MessageKey } from '@/i18n/messages.js';

interface HistoryPaneProps {
  items: PrintHistoryMeta[];
  busy: boolean;
  onPrintAgain: (id: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export function HistoryPane(props: HistoryPaneProps) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState('');
  const visible = useMemo(() => filterHistoryItems(props.items, query), [props.items, query]);
  const groups = useMemo(() => groupHistoryItems(visible), [visible]);

  return (
    <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-ink-50">{t('historyTitle')}</h1>
          <p className="mt-1 text-ui-xs text-ink-400">{t('historyHint')}</p>
        </div>
        <div className="flex min-w-0 flex-col items-stretch gap-2 sm:w-72">
          <p className="text-right text-ui-2xs text-ink-500 sm:text-right">
            {t('historyCount', { n: visible.length })}
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-500" />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('historySearch')}
              aria-label={t('historySearch')}
              className="border-white/10 bg-ink-950/70 pl-8 text-ink-100 placeholder:text-ink-500"
            />
          </div>
        </div>
      </header>

      {props.items.length === 0 ? (
        <EmptyState title={t('historyEmpty')} hint={t('historyEmptyHint')} />
      ) : visible.length === 0 ? (
        <EmptyState title={t('historyNoResults')} hint={t('historyNoResultsHint')} />
      ) : (
        groups.map((group) => (
          <section key={group.key} className="flex flex-col gap-3">
            <h2 className="text-ui-xs font-medium tracking-wide text-ink-400 uppercase">
              {groupLabel(group.key, locale, t)}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => (
                <HistoryCard
                  key={item.id}
                  item={item}
                  locale={locale}
                  busy={props.busy}
                  onPrintAgain={props.onPrintAgain}
                  onOpen={props.onOpen}
                  onDelete={props.onDelete}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function HistoryCard(props: {
  item: PrintHistoryMeta;
  locale: string;
  busy: boolean;
  onPrintAgain: (id: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useI18n();
  const { item } = props;
  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-ink-950/80 shadow-panel transition-colors hover:border-white/20">
      <button
        type="button"
        className="group block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        onClick={() => props.onOpen(item.id)}
      >
        <HistoryPreview
          id={item.id}
          label={item.jobName}
          widthMm={item.widthMm}
          heightMm={item.heightMm}
        />
        <div className="px-4 pt-3 pb-1">
          <p className="truncate text-sm font-medium text-ink-50 group-hover:text-primary">{item.jobName}</p>
          <p className="mt-1 text-ui-2xs text-ink-500">
            {formatWhen(item.printedAt, props.locale)} · {item.widthMm} × {item.heightMm} mm
          </p>
          <p className="mt-0.5 truncate text-ui-2xs text-ink-500">
            {item.printerName}
            {item.copies > 1 ? ` · ${t('historyCopies', { n: item.copies })}` : ''}
          </p>
        </div>
      </button>
      <div className="flex items-center gap-2 border-t border-white/5 px-3 py-3">
        <Button
          type="button"
          size="sm"
          className="min-w-0 flex-1"
          disabled={props.busy}
          onClick={() => props.onPrintAgain(item.id)}
        >
          <Printer />
          {t('historyPrintAgain')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-w-0 flex-1"
          onClick={() => props.onOpen(item.id)}
        >
          <SquarePen />
          {t('historyOpen')}
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={t('libraryDelete')}
              className="shrink-0 text-ink-400 hover:bg-red-500/10 hover:text-red-400"
              onClick={() => props.onDelete(item.id)}
            >
              <Trash2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>
            {t('libraryDelete')}
          </TooltipContent>
        </Tooltip>
      </div>
    </article>
  );
}

function HistoryPreview(props: { id: string; label: string; widthMm: number; heightMm: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    void window.thermalBridge.library
      .getHistoryPng(props.id)
      .then((png) => {
        if (cancelled) {
          return;
        }
        const blob = new Blob([copyToUint8Array(png).buffer], { type: 'image/png' });
        const next = URL.createObjectURL(blob);
        revoked = next;
        setUrl(next);
      })
      .catch(() => {
        if (!cancelled) {
          setUrl(null);
        }
      });
    return () => {
      cancelled = true;
      if (revoked) {
        URL.revokeObjectURL(revoked);
      }
    };
  }, [props.id]);

  return (
    <div className="flex h-56 items-center justify-center bg-ink-900 px-5 py-5">
      {url ? (
        <img
          src={url}
          alt={props.label}
          className="max-h-full max-w-full rounded-sm bg-white object-contain shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
          style={{ aspectRatio: `${String(props.widthMm)} / ${String(props.heightMm)}` }}
        />
      ) : (
        <div
          className="h-full max-h-full w-full max-w-[70%] rounded-sm bg-ink-800"
          style={{ aspectRatio: `${String(props.widthMm)} / ${String(props.heightMm)}` }}
        />
      )}
    </div>
  );
}

function EmptyState(props: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-ink-950/40 px-6 py-16 text-center">
      <History className="mb-3 size-8 text-ink-500" />
      <p className="text-sm font-medium text-ink-200">{props.title}</p>
      <p className="mt-1 max-w-sm text-ui-xs text-ink-500">{props.hint}</p>
    </div>
  );
}

function groupLabel(key: string, locale: string, t: (id: MessageKey) => string): string {
  if (key === 'today') {
    return t('historyToday');
  }
  if (key === 'yesterday') {
    return t('historyYesterday');
  }
  const date = new Date(`${key}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return key;
  }
  return date.toLocaleDateString(locale === 'ro' ? 'ro-RO' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
