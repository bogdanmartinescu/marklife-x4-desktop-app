import { Bluetooth, Cable, Loader2, Printer, Usb } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PrinterBackend, PrinterInfo } from '@thermalbridge/shared';
import { Button } from '@/components/ui/button.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import type { MessageKey } from '@/i18n/messages.js';
import { cn } from '@/lib/utils.js';
import { bleSignalBars } from './ble-signal.js';
import { ConnectionStatusBadge } from './ConnectionStatusBadge.js';
import { linkStateFromDevice, type LinkState } from './connection-status.js';

const BACKEND_KEYS: Record<PrinterBackend, MessageKey> = {
  'windows-spooler': 'backendWindows',
  cups: 'backendCups',
  tcp: 'backendTcp',
  usb: 'backendUsb',
  'bluetooth-spp': 'backendSpp',
  'bluetooth-ble': 'backendBle',
};

const BACKEND_ICONS: Record<PrinterBackend, LucideIcon> = {
  'windows-spooler': Printer,
  cups: Printer,
  tcp: Cable,
  usb: Usb,
  'bluetooth-spp': Bluetooth,
  'bluetooth-ble': Bluetooth,
};

export function DeviceList(props: {
  devices: PrinterInfo[];
  empty: string;
  selectedId: string;
  scanning?: boolean;
  subtitle?: (device: PrinterInfo) => string | undefined;
  stateFor?: (device: PrinterInfo) => LinkState;
  onSelect: (device: PrinterInfo) => void;
}) {
  const { t } = useI18n();
  if (props.devices.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 bg-ink-850/60 px-4 py-10 text-center">
        {props.scanning === true ? (
          <Loader2 className="size-7 animate-spin text-primary" />
        ) : (
          <Bluetooth className="size-7 text-ink-500" />
        )}
        <p className="max-w-sm text-sm text-ink-400">
          {props.scanning === true ? t('bleScanningHint') : props.empty}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {props.devices.map((device) => {
        const state = props.stateFor?.(device) ?? linkStateFromDevice(device);
        const subtitle = props.subtitle?.(device);
        const selected = props.selectedId === device.id;
        const Icon = BACKEND_ICONS[device.backend];
        const bars = bleSignalBars(device.rssi);
        return (
          <li key={device.id}>
            <div
              className={cn(
                'flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/5 bg-ink-850/80 p-3 text-left transition-colors hover:border-white/10 hover:bg-ink-800',
                selected && 'border-primary/40 bg-primary/5 ring-1 ring-primary/25',
              )}
              onClick={() => props.onSelect(device)}
            >
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-ink-300',
                  selected && 'bg-primary/15 text-primary',
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1 space-y-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium text-ink-50">{device.name}</span>
                  <ConnectionStatusBadge state={state} />
                </span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-ui-xs text-ink-400">
                  <span>{t(BACKEND_KEYS[device.backend])}</span>
                  {subtitle ? (
                    <span className="font-mono text-[11px] text-ink-500">{subtitle}</span>
                  ) : null}
                </span>
              </span>
              {bars === 1 || bars === 2 || bars === 3 || bars === 4 ? (
                <SignalBars bars={bars} />
              ) : null}
              <Button
                type="button"
                size="sm"
                variant={selected ? 'default' : 'outline'}
                onClick={(event) => {
                  event.stopPropagation();
                  props.onSelect(device);
                }}
              >
                {selected ? t('selected') : t('connectDevice')}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function SignalBars(props: { bars: 1 | 2 | 3 | 4 }) {
  return (
    <span className="inline-flex h-4 items-end gap-px" aria-hidden>
      {([1, 2, 3, 4] as const).map((level) => (
        <span
          key={level}
          className={cn(
            'w-[3px] rounded-sm',
            level <= props.bars ? 'bg-primary' : 'bg-ink-600',
          )}
          style={{ height: `${6 + level * 2}px` }}
        />
      ))}
    </span>
  );
}
