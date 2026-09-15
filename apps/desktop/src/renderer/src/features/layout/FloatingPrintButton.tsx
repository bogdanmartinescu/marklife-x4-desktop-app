import { Printer } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider.js';
import { cn } from '@/lib/utils.js';

interface FloatingPrintButtonProps {
  disabled: boolean;
  busy: boolean;
  onClick: () => void;
}

export function FloatingPrintButton(props: FloatingPrintButtonProps) {
  const { t } = useI18n();

  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'flex h-14 items-center justify-center gap-2.5 rounded-xl',
        'bg-primary px-6 text-ui-base font-semibold text-on-accent',
        'shadow-lg shadow-black/40',
        'transition-all duration-200',
        'hover:bg-accent-600 hover:shadow-xl hover:shadow-black/50 hover:-translate-y-0.5',
        'active:translate-y-0 active:shadow-md',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg',
      )}
    >
      <Printer className="size-5" />
      <span>{props.busy ? t('printing') : t('print')}</span>
    </button>
  );
}
