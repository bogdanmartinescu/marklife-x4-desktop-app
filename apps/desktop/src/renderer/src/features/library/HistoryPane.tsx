import { useEffect, useState } from 'react';
import { History, Printer, Trash2 } from 'lucide-react';
import type { PrintHistoryMeta } from '@thermalbridge/shared';
import { Button } from '@/components/ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.js';
import { copyToUint8Array } from '@/features/import/source-bytes.js';
import { useI18n } from '@/i18n/I18nProvider.js';

interface HistoryPaneProps {
  items: PrintHistoryMeta[];
  busy: boolean;
  onPrintAgain: (id: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export function HistoryPane(props: HistoryPaneProps) {
  const { t, locale } = useI18n();
  return (
    <Card className="mx-auto w-full max-w-3xl min-w-0">
      <CardHeader>
        <CardTitle>{t('historyTitle')}</CardTitle>
        <CardDescription>{t('historyHint')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {props.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('historyEmpty')}</p>
        ) : (
          props.items.map((item) => (
            <article
              key={item.id}
              className="flex gap-3 rounded-xl border border-white/5 bg-ink-800/60 p-3"
            >
              <HistoryThumb id={item.id} label={item.jobName} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.jobName}</p>
                <p className="text-ui-2xs text-muted-foreground">
                  {formatWhen(item.printedAt, locale)} · {item.widthMm} × {item.heightMm} mm ·{' '}
                  {item.printerName}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="xs"
                    disabled={props.busy}
                    onClick={() => props.onPrintAgain(item.id)}
                  >
                    <Printer />
                    {t('historyPrintAgain')}
                  </Button>
                  <Button type="button" size="xs" variant="outline" onClick={() => props.onOpen(item.id)}>
                    <History />
                    {t('historyOpen')}
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => props.onDelete(item.id)}
                  >
                    <Trash2 />
                    {t('libraryDelete')}
                  </Button>
                </div>
              </div>
            </article>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function HistoryThumb(props: { id: string; label: string }) {
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
  if (!url) {
    return <div className="size-16 shrink-0 rounded-md bg-ink-750" />;
  }
  return (
    <img src={url} alt={props.label} className="size-16 shrink-0 rounded-md bg-white object-contain" />
  );
}

function formatWhen(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(locale === 'ro' ? 'ro-RO' : 'en-GB');
}
