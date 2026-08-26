import { cn } from '@/lib/utils.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import type { LinkState } from './connection-status.js';

export function ConnectionStatusBadge(props: { state: LinkState; className?: string }) {
  const { t } = useI18n();
  const label =
    props.state === 'connected'
      ? t('connected')
      : props.state === 'disconnected'
        ? t('disconnected')
        : t('connectionUnknown');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        props.state === 'connected' &&
          'border-emerald-500/30 bg-emerald-500/15 text-emerald-400',
        props.state === 'disconnected' &&
          'border-red-500/30 bg-red-500/15 text-red-400',
        props.state === 'unknown' && 'border-border bg-muted text-muted-foreground',
        props.className,
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          props.state === 'connected' && 'bg-emerald-400',
          props.state === 'disconnected' && 'bg-red-400',
          props.state === 'unknown' && 'bg-muted-foreground',
        )}
      />
      {label}
    </span>
  );
}
