import { useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/I18nProvider.js';
import { cn } from '@/lib/utils.js';
import type { SourceFilmstripItem } from './source-filmstrip.js';

interface SourceFilmstripProps {
  items: readonly SourceFilmstripItem[];
  selectedPageId: string;
  onSelectPage: (pageId: string) => void;
}

export function SourceFilmstrip(props: SourceFilmstripProps) {
  const { t } = useI18n();
  const header = props.items[0];
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [props.selectedPageId]);

  if (header === undefined) {
    return null;
  }

  return (
    <div className="pointer-events-auto flex h-full w-36 flex-col overflow-hidden rounded-xl border border-white/10 bg-ink-950/95 shadow-panel backdrop-blur-sm">
      <div className="shrink-0 border-b border-white/5 px-2.5 py-2">
        <p className="truncate text-ui-xs font-medium text-ink-100" title={header.name}>
          {header.name}
        </p>
        <p className="mt-0.5 text-ui-2xs text-ink-500">
          {t('sourcePreviewPages', { n: header.pageCount })}
        </p>
      </div>
      <div
        className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-2 py-2"
        role="listbox"
        aria-label={t('sourcePreviewTitle')}
      >
        {props.items.map((item) => {
          const selected = item.pageId === props.selectedPageId;
          return (
            <button
              key={item.pageId}
              ref={selected ? selectedRef : undefined}
              type="button"
              role="option"
              aria-selected={selected}
              title={t('sourcePreviewPage', { n: item.pageNumber })}
              className={cn(
                'relative aspect-[3/4] w-full shrink-0 overflow-hidden rounded-md bg-white ring-1 ring-white/10 hover:ring-primary/60',
                selected && 'ring-2 ring-primary',
              )}
              onClick={() => props.onSelectPage(item.pageId)}
            >
              <img
                src={item.previewUrl}
                alt={t('sourcePreviewPage', { n: item.pageNumber })}
                className="size-full object-cover"
              />
              <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[9px] leading-none text-white">
                {item.pageNumber}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
