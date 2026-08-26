import type { PrinterBinding, PrinterBackend, PrinterInfo } from '@thermalbridge/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import type { MessageKey } from '@/i18n/messages.js';
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
  onSelect: (printer: PrinterInfo, extra?: Partial<PrinterBinding>) => void;
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

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <CardTitle>{t('setupTitle')}</CardTitle>
        <CardDescription>{t('setupDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {selected?.name ?? t('noPrinterBound')}
            </p>
            <p className="text-xs text-muted-foreground">
              {selected ? t(BACKEND_KEYS[selected.backend]) : t('selectPrinter')}
            </p>
          </div>
          {props.selectedId ? <ConnectionStatusBadge state={linkState} /> : null}
        </div>
        <ConnectionTabs {...props} />
      </CardContent>
    </Card>
  );
}
