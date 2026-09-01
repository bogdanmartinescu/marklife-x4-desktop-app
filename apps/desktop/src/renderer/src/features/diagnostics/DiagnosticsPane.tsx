import { useEffect, useState } from 'react';
import type { SystemDiagnostics } from '@thermalbridge/shared';
import { Button } from '@/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.js';
import { useI18n } from '@/i18n/I18nProvider.js';

export function DiagnosticsPane() {
  const { t } = useI18n();
  const [info, setInfo] = useState<SystemDiagnostics | null>(null);
  const [exportPath, setExportPath] = useState('');

  useEffect(() => {
    if (!window.thermalBridge) {
      return;
    }
    void window.thermalBridge.diagnostics.getSystemInfo().then(setInfo);
  }, []);

  return (
    <Card className="mx-auto w-full min-w-0 max-w-xl">
      <CardHeader>
        <CardTitle>{t('diagnosticsTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {info ? (
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-[8.75rem_1fr]">
            <dt className="text-muted-foreground">{t('diagApp')}</dt>
            <dd>{info.appVersion}</dd>
            <dt className="text-muted-foreground">{t('diagElectron')}</dt>
            <dd>{info.electronVersion}</dd>
            <dt className="text-muted-foreground">{t('diagOs')}</dt>
            <dd>
              {info.os} / {info.arch}
            </dd>
            <dt className="text-muted-foreground">{t('diagPrintbridge')}</dt>
            <dd>{info.printbridgeVersion ?? t('notRunning')}</dd>
            <dt className="text-muted-foreground">{t('diagPrinters')}</dt>
            <dd>{info.printers.length}</dd>
            <dt className="text-muted-foreground">{t('diagLastPrint')}</dt>
            <dd>{info.lastPrintResult?.message ?? t('none')}</dd>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">{t('diagnosticsLoading')}</p>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void window.thermalBridge.diagnostics.exportBundle().then(setExportPath);
          }}
        >
          {t('exportBundle')}
        </Button>
        {exportPath ? <p className="text-xs text-muted-foreground">{exportPath}</p> : null}
      </CardContent>
    </Card>
  );
}
