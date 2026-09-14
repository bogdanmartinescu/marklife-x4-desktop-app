import { FileText, ImageIcon, LayoutTemplate, Trash2 } from 'lucide-react';
import type { LabelTemplateMeta, MediaFileMeta } from '@thermalbridge/shared';
import { Button } from '@/components/ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.js';
import { SyncFolderCard } from '@/features/library/SyncFolderCard.js';
import { formatByteSize } from '@/features/library/print-history.js';
import { useI18n } from '@/i18n/I18nProvider.js';

interface LibraryPaneProps {
  items: MediaFileMeta[];
  templates: LabelTemplateMeta[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onApplyTemplate: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
  /** Called after sync changes so the parent can reload library lists. */
  onSyncChanged?: () => void;
}

export function LibraryPane(props: LibraryPaneProps) {
  const { t, locale } = useI18n();
  return (
    <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-4">
      <SyncFolderCard onChanged={props.onSyncChanged} />
      <Card>
        <CardHeader>
          <CardTitle>{t('templatesTitle')}</CardTitle>
          <CardDescription>{t('templatesHint')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {props.templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('templatesEmpty')}</p>
          ) : (
            props.templates.map((item) => (
              <article
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-ink-800/60 p-3"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-ink-750 text-ink-300">
                  <LayoutTemplate className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-ui-2xs text-muted-foreground">
                    {item.widthMm} × {item.heightMm} mm · {item.pageCount} · {formatWhen(item.updatedAt, locale)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  <Button type="button" size="xs" onClick={() => props.onApplyTemplate(item.id)}>
                    {t('templatesApply')}
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => props.onDeleteTemplate(item.id)}
                  >
                    <Trash2 />
                    {t('libraryDelete')}
                  </Button>
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('libraryTitle')}</CardTitle>
          <CardDescription>{t('libraryHint')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {props.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('libraryEmpty')}</p>
          ) : (
            props.items.map((item) => (
              <article
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-ink-800/60 p-3"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-ink-750 text-ink-300">
                  {item.mimeType === 'application/pdf' ? (
                    <FileText className="size-5" />
                  ) : (
                    <ImageIcon className="size-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-ui-2xs text-muted-foreground">
                    {formatByteSize(item.byteLength)} · {formatWhen(item.createdAt, locale)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  <Button type="button" size="xs" onClick={() => props.onOpen(item.id)}>
                    {t('libraryOpen')}
                  </Button>
                  <Button type="button" size="xs" variant="ghost" onClick={() => props.onDelete(item.id)}>
                    <Trash2 />
                    {t('libraryDelete')}
                  </Button>
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatWhen(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(locale === 'ro' ? 'ro-RO' : 'en-GB');
}
