import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.js';
import { APP_MAINTAINER } from '@/features/about/about-app.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import appIcon from '@/assets/app-icon.png';

interface AboutAppDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AboutAppDialog(props: AboutAppDialogProps) {
  const { t } = useI18n();
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!props.open || !window.thermalBridge) {
      return;
    }
    void window.thermalBridge.diagnostics.getSystemInfo().then((info) => {
      setVersion(info.appVersion);
    });
  }, [props.open]);

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="w-full max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{t('aboutTitle')}</DialogTitle>
          <DialogDescription>{t('appTagline')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 text-center">
          <img src={appIcon} alt={t('appName')} className="size-16 rounded-2xl object-cover" />
          <div>
            <p className="text-base font-semibold text-ink-50">{t('appName')}</p>
            <p className="mt-0.5 text-ui-xs text-ink-400">
              {version ? t('aboutVersion', { n: version }) : t('diagnosticsLoading')}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-xl border border-white/5 bg-ink-900/50 px-4 py-3 text-left text-ui-xs">
          <dt className="text-ink-500">{t('aboutMaintainer')}</dt>
          <dd className="font-medium text-ink-100">{APP_MAINTAINER.name}</dd>
          <dt className="text-ink-500">{t('aboutCui')}</dt>
          <dd className="text-ink-200">{APP_MAINTAINER.cui}</dd>
          <dt className="text-ink-500">{t('aboutAddress')}</dt>
          <dd className="text-ink-200">{APP_MAINTAINER.address}</dd>
          <dt className="text-ink-500">{t('aboutEmail')}</dt>
          <dd>
            <a
              href={APP_MAINTAINER.mailtoUrl}
              className="text-primary hover:underline"
              onClick={(event) => {
                event.preventDefault();
                window.open(APP_MAINTAINER.mailtoUrl, '_blank', 'noopener,noreferrer');
              }}
            >
              {APP_MAINTAINER.email}
            </a>
          </dd>
          <dt className="text-ink-500">{t('aboutWebsite')}</dt>
          <dd>
            <a
              href={APP_MAINTAINER.websiteUrl}
              className="text-primary hover:underline"
              onClick={(event) => {
                event.preventDefault();
                window.open(APP_MAINTAINER.websiteUrl, '_blank', 'noopener,noreferrer');
              }}
            >
              {APP_MAINTAINER.websiteLabel}
            </a>
          </dd>
        </dl>
        <DialogFooter>
          <Button type="button" size="sm" onClick={props.onClose}>
            {t('aboutClose')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
