import type { ReactElement } from 'react';
import { X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert.js';
import { Button } from '@/components/ui/button.js';
import { useI18n } from '@/i18n/I18nProvider.js';

export function PhotoCleanupBanner(props: {
  onRevert: () => void;
  onDismiss: () => void;
}): ReactElement {
  const { t } = useI18n();
  return (
    <Alert className="shrink-0 rounded-none border-x-0 border-t-0">
      <AlertDescription className="flex w-full flex-wrap items-center justify-between gap-2">
        <p>{t('photoLowResCleanup')}</p>
        <span className="flex items-center gap-1">
          <Button type="button" size="sm" variant="outline" onClick={props.onRevert}>
            {t('photoCleanupRevert')}
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={t('photoCleanupDismiss')}
            onClick={props.onDismiss}
          >
            <X />
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  );
}
