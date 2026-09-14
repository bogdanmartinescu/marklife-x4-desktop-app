import { useEffect, useState } from 'react';
import { AlertTriangle, FolderOpen, FolderSync, X } from 'lucide-react';
import type { SyncStatus } from '@thermalbridge/shared';
import { Button } from '@/components/ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.js';
import { useI18n } from '@/i18n/I18nProvider.js';

interface SyncFolderCardProps {
  /** Called after a status change so the parent can refresh library lists. */
  onChanged?: (() => void) | undefined;
}

export function SyncFolderCard(props: SyncFolderCardProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = (): void => {
    if (!window.thermalBridge) {
      return;
    }
    void window.thermalBridge.sync.getStatus().then(setStatus).catch(() => undefined);
  };

  useEffect(() => {
    refresh();
  }, []); // run once on mount

  const handleChoose = (): void => {
    if (!window.thermalBridge || busy) {
      return;
    }
    setBusy(true);
    void window.thermalBridge.sync
      .chooseFolder()
      .then((s) => {
        setStatus(s);
        props.onChanged?.();
      })
      .catch(() => undefined)
      .finally(() => setBusy(false));
  };

  const handleDisconnect = (): void => {
    if (!window.thermalBridge || busy) {
      return;
    }
    setBusy(true);
    void window.thermalBridge.sync
      .disconnect()
      .then((s) => {
        setStatus(s);
        props.onChanged?.();
      })
      .catch(() => undefined)
      .finally(() => setBusy(false));
  };

  const handleOpenFolder = (): void => {
    if (!window.thermalBridge || status?.folderPath == null) {
      return;
    }
    window.thermalBridge.sync.openFolder(status.folderPath);
  };

  if (status === null) {
    return null;
  }

  const folderName = status.folderPath !== null ? status.folderPath.split(/[\\/]/).pop() ?? status.folderPath : null;
  const dropboxHint = status.dropboxSuggested !== null && status.folderPath === null;

  return (
    <Card className="border-white/5 bg-ink-900/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <FolderSync className="size-4 shrink-0 text-ink-400" />
          {t('syncTitle')}
        </CardTitle>
        {status.folderPath === null && (
          <CardDescription className="text-ui-xs">{t('syncOffHint')}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {status.conflicted && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-900/30 px-3 py-2 text-ui-xs text-amber-300">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>{t('syncConflictWarning')}</span>
          </div>
        )}
        {status.folderPath !== null ? (
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-ui-xs text-ink-300">
              <span className="text-ink-500">{t('syncConnected')}</span>{' '}
              <span className="font-medium">{folderName}</span>
            </span>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={handleOpenFolder}
              title={t('syncOpenFolder')}
            >
              <FolderOpen className="size-3.5" />
              <span className="sr-only">{t('syncOpenFolder')}</span>
            </Button>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={handleDisconnect}
              disabled={busy}
              title={t('syncDisconnect')}
            >
              <X className="size-3.5" />
              <span className="sr-only">{t('syncDisconnect')}</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="xs"
              onClick={handleChoose}
              disabled={busy}
              className="shrink-0"
            >
              {t('syncChooseFolder')}
            </Button>
            {dropboxHint && (
              <span className="text-ui-xs text-primary">{t('syncDropboxDetected')}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
