import { Bluetooth } from 'lucide-react';
import type { PrinterBinding, PrinterInfo } from '@thermalbridge/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.js';
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
  bindings?: readonly PrinterBinding[];
  onClose: () => void;
  onSelect: (printer: PrinterInfo, extra?: Partial<PrinterBinding>) => void;
  onForget?: (id: string) => void;
  onRefresh: () => void;
  onRefreshUsb: () => void;
  onRefreshSpp: () => void;
  onScanBle: () => void;
  onOpenBluetoothPairing: () => Promise<void>;
}

export function ConnectPrinterDialog(props: ConnectPrinterDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent
        showCloseButton
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden p-0"
      >
        <DialogHeader className="px-5 pt-5 pr-12">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Bluetooth className="size-5 text-primary" />
            {t('connectPrinter')}
          </DialogTitle>
          <DialogDescription>{t('connectPrinterHint')}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden px-5 pb-5">
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
              {...(props.bindings !== undefined ? { bindings: props.bindings } : {})}
              {...(props.onForget !== undefined ? { onForget: props.onForget } : {})}
              onRefresh={props.onRefresh}
              onRefreshUsb={props.onRefreshUsb}
              onRefreshSpp={props.onRefreshSpp}
              onScanBle={props.onScanBle}
              onOpenBluetoothPairing={props.onOpenBluetoothPairing}
              initialTab="ble"
            />
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
