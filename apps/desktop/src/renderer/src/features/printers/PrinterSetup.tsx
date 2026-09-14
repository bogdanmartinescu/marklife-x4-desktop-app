import { Bluetooth, Cable, Printer, Trash2, Usb } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PrinterBinding, PrinterBackend, PrinterInfo } from '@thermalbridge/shared';
import { Button } from '@/components/ui/button.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import type { MessageKey } from '@/i18n/messages.js';
import { cn } from '@/lib/utils.js';
import { boundPrinterIds } from './bindings.js';
import { ConnectionStatusBadge } from './ConnectionStatusBadge.js';
import { ConnectionTabs } from './ConnectionTabs.js';
import { mergePrinterCatalog, resolveLinkState } from './connection-status.js';

interface PrinterSetupProps {
  printers: PrinterInfo[];
  usbDevices: PrinterInfo[];
  sppPorts: PrinterInfo[];
  bleDevices: PrinterInfo[];
  scanning: boolean;
  scanError?: string | null;
  selectedId: string;
  bindings: readonly PrinterBinding[];
  onSelect: (printer: PrinterInfo, extra?: Partial<PrinterBinding>) => void;
  onForget: (id: string) => void;
  onRefresh: () => void;
  onRefreshUsb: () => void;
  onRefreshSpp: () => void;
  onScanBle: () => void;
  onOpenBluetoothPairing: () => Promise<void>;
}

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

export function PrinterSetup(props: PrinterSetupProps) {
  const { t } = useI18n();
  const catalog = mergePrinterCatalog(
    props.printers,
    props.usbDevices,
    props.sppPorts,
    props.bleDevices,
  );
  const selected = catalog.find((item) => item.id === props.selectedId);
  const linkState = resolveLinkState({
    printerId: props.selectedId,
    printers: catalog,
    usbDevices: props.usbDevices,
    sppPorts: props.sppPorts,
    bleDevices: props.bleDevices,
  });
  const SelectedIcon = selected ? BACKEND_ICONS[selected.backend] : Printer;
  const canForgetCurrent = boundPrinterIds(props.bindings).has(props.selectedId);

  return (
    <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6">
      <header className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink-50">{t('setupTitle')}</h1>
        <p className="mt-1 text-ui-xs text-ink-400">{t('setupDescription')}</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-white/10 bg-ink-950/80 p-5 shadow-panel lg:sticky lg:top-4">
          <p className="text-ui-2xs font-medium tracking-wide text-ink-500 uppercase">
            {t('setupCurrent')}
          </p>
          <div className="mt-4 flex items-start gap-3">
            <span
              className={cn(
                'flex size-12 shrink-0 items-center justify-center rounded-xl',
                selected
                  ? 'bg-primary/15 text-primary'
                  : 'bg-ink-800 text-ink-500',
              )}
            >
              <SelectedIcon className="size-6" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink-50">
                {selected?.name ?? t('noPrinterBound')}
              </p>
              <p className="mt-1 text-ui-xs text-ink-400">
                {selected ? t(BACKEND_KEYS[selected.backend]) : t('setupChooseHint')}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {props.selectedId ? (
              <ConnectionStatusBadge state={linkState} />
            ) : (
              <p className="text-ui-xs text-ink-500">{t('selectPrinter')}</p>
            )}
            {canForgetCurrent ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="ml-auto text-ink-400 hover:bg-red-500/10 hover:text-red-400"
                onClick={() => props.onForget(props.selectedId)}
              >
                <Trash2 />
                {t('printerForget')}
              </Button>
            ) : null}
          </div>
        </aside>

        <section className="min-w-0 rounded-2xl border border-white/10 bg-ink-950/80 p-4 shadow-panel sm:p-5">
          <p className="mb-3 text-ui-2xs font-medium tracking-wide text-ink-500 uppercase">
            {t('setupMethods')}
          </p>
          <ConnectionTabs {...props} />
        </section>
      </div>
    </div>
  );
}
