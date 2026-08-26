import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { FileUp, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js';
import { Field } from '@/components/field.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import { cn } from '@/lib/utils.js';
import type { SourceDocument } from '@/state/types.js';

interface SourcePaneProps {
  source: SourceDocument | null;
  onFile: (file: File) => void;
  onOpenDialog: () => void;
  onPageChange: (page: number) => void;
}

export function SourcePane(props: SourcePaneProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

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

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      props.onFile(file);
    }
  };

  const onSelect = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      props.onFile(file);
    }
    event.target.value = '';
  };

  return (
    <Card className="flex h-full min-h-0 flex-col gap-4 overflow-hidden py-4">
      <CardHeader className="px-4">
        <CardTitle>{t('sourcesTitle')}</CardTitle>
        <CardDescription>{t('sourcesHint')}</CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-4 overflow-auto px-4">
        <div
          className={cn(
            'flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/40 px-3 py-5 text-center',
            dragOver && 'border-primary bg-primary/10',
          )}
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
          <FileUp className="size-6 text-muted-foreground" />
          <p className="text-xs leading-snug text-muted-foreground">{t('dropLabel')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" size="sm" onClick={props.onOpenDialog}>
              <FolderOpen />
              {t('addFile')}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
              {t('browse')}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              className="sr-only"
              onChange={onSelect}
            />
          </div>
        </div>
        {props.source ? <LoadedSource source={props.source} onPageChange={props.onPageChange} /> : (
          <p className="text-sm text-muted-foreground">{t('noFile')}</p>
        )}
      </CardContent>
    </Card>
  );
}

function LoadedSource(props: {
  source: SourceDocument;
  onPageChange: (page: number) => void;
}) {
  const { t } = useI18n();
  const { source, onPageChange } = props;
  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div>
        <p className="break-all font-medium leading-tight">{source.name}</p>
        <p className="text-xs text-muted-foreground">{source.mimeType}</p>
      </div>
      {source.pageCount > 1 ? (
        <Field label={t('page')}>
          <Select
            value={String(source.pageNumber)}
            onValueChange={(value) => onPageChange(Number(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: source.pageCount }, (_, index) => (
                <SelectItem key={index + 1} value={String(index + 1)}>
                  {index + 1} / {source.pageCount}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}
    </div>
  );
}
