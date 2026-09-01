import { Bluetooth, X } from 'lucide-react';
import type { PrinterBinding, PrinterInfo } from '@thermalbridge/shared';
import { Button } from '@/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.js';
import { ScrollArea } from '@/components/ui/scroll-area.js';
import { ConnectionTabs } from './ConnectionTabs.js';
import { useI18n } from '@/i18n/I18nProvider.js';

interface ConnectPrinterDialogProps {
  open: boolean;
  printers: PrinterInfo[];
  usbDevices: PrinterInfo[];
  sppPorts: PrinterInfo[];
  bleDevices: PrinterInfo[];
  scanning: boolean;
  scanError?: string | null;
  selectedId: string;
  onClose: () => void;
  onSelect: (printer: PrinterInfo, extra?: Partial<PrinterBinding>) => void;
  onRefresh: () => void;
  onRefreshUsb: () => void;
  onRefreshSpp: () => void;
  onScanBle: () => void;
  onOpenBluetoothPairing: () => Promise<void>;
}

export function ConnectPrinterDialog(props: ConnectPrinterDialogProps) {
  const { t } = useI18n();
  if (!props.open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={props.onClose}
    >
      <Card
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden border-white/5 bg-ink-800 py-4 shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-3 px-5">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bluetooth className="size-5 text-primary" />
              {t('connectPrinter')}
            </CardTitle>
            <p className="text-sm text-ink-400">{t('connectPrinterHint')}</p>
          </div>
          <Button type="button" size="icon-sm" variant="ghost" onClick={props.onClose}>
            <X />
          </Button>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-hidden px-5">
          <ScrollArea className="h-[min(36rem,68vh)] pr-3">
            <ConnectionTabs
              printers={props.printers}
              usbDevices={props.usbDevices}
              sppPorts={props.sppPorts}
              bleDevices={props.bleDevices}
              scanning={props.scanning}
              scanError={props.scanError ?? null}
              selectedId={props.selectedId}
              onSelect={props.onSelect}
              onRefresh={props.onRefresh}
              onRefreshUsb={props.onRefreshUsb}
              onRefreshSpp={props.onRefreshSpp}
              onScanBle={props.onScanBle}
              onOpenBluetoothPairing={props.onOpenBluetoothPairing}
              initialTab="bluetooth"
              initialBtMode="ble"
            />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
