import { useState, type ReactNode } from 'react';
import type { PrinterBinding, PrinterInfo } from '@thermalbridge/shared';
import { Bluetooth, Cable, Loader2, Printer, Usb } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert.js';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.js';
import { Field } from '@/components/field.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import { boundPrinterIds } from './bindings.js';
import { DeviceList } from './DeviceList.js';
import {
  mergePrinterCatalog,
  resolveLinkState,
} from './connection-status.js';
import { bleBindingExtra, serialBindingExtra, usbBindingExtra } from './binding-extra.js';
import { sortLikelyPrintersFirst } from './likely-printer.js';

export type ConnectionTab = 'usb' | 'ble' | 'spp' | 'os' | 'tcp';

interface ConnectionTabsProps {
  printers: PrinterInfo[];
  usbDevices: PrinterInfo[];
  sppPorts: PrinterInfo[];
  bleDevices: PrinterInfo[];
  bindings?: readonly PrinterBinding[];
  scanning: boolean;
  scanError?: string | null;
  selectedId: string;
  initialTab?: ConnectionTab;
  onSelect: (printer: PrinterInfo, extra?: Partial<PrinterBinding>) => void;
  onForget?: (id: string) => void;
  onRefresh: () => void;
  onRefreshUsb: () => void;
  onRefreshSpp: () => void;
  onScanBle: () => void;
  onOpenBluetoothPairing: () => Promise<void>;
}

export function ConnectionTabs(props: ConnectionTabsProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<ConnectionTab>(props.initialTab ?? 'usb');
  const [tcpHost, setTcpHost] = useState('192.168.1.80');
  const [tcpPort, setTcpPort] = useState('9100');
  const [manualPort, setManualPort] = useState('');
  const [pairing, setPairing] = useState(false);
  const boundIds = boundPrinterIds(props.bindings ?? []);

  const openPairing = async (): Promise<void> => {
    setPairing(true);
    try {
      await props.onOpenBluetoothPairing();
    } finally {
      setPairing(false);
    }
  };

  const osPrinters = sortLikelyPrintersFirst(
    props.printers.filter((item) => item.backend === 'cups' || item.backend === 'windows-spooler'),
  );
  const usbList = sortLikelyPrintersFirst(
    mergePrinterCatalog(
      props.printers.filter((item) => item.backend === 'usb'),
      props.usbDevices,
    ),
  );
  const sppList = sortLikelyPrintersFirst(
    mergePrinterCatalog(
      props.printers.filter((item) => item.backend === 'bluetooth-spp'),
      props.sppPorts,
    ),
  );
  const bleList = sortLikelyPrintersFirst(
    mergePrinterCatalog(
      props.printers.filter((item) => item.backend === 'bluetooth-ble'),
      props.bleDevices,
    ),
  );
  const tcpList = sortLikelyPrintersFirst(props.printers.filter((item) => item.backend === 'tcp'));
  const listExtras = {
    boundIds,
    ...(props.onForget !== undefined ? { onForget: props.onForget } : {}),
  };

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as ConnectionTab)} className="gap-5">
      <TabsList
        variant="line"
        className="h-auto w-full flex-wrap justify-stretch gap-0 border-b border-white/10 pb-0"
      >
        <TabsTrigger value="usb" className="h-11 min-w-0 flex-1 flex-col gap-1 px-1 text-[11px] sm:flex-row sm:gap-1.5 sm:text-xs">
          <Usb />
          {t('tabUsbShort')}
        </TabsTrigger>
        <TabsTrigger value="ble" className="h-11 min-w-0 flex-1 flex-col gap-1 px-1 text-[11px] sm:flex-row sm:gap-1.5 sm:text-xs">
          <Bluetooth />
          {t('ble')}
        </TabsTrigger>
        <TabsTrigger value="spp" className="h-11 min-w-0 flex-1 flex-col gap-1 px-1 text-[11px] sm:flex-row sm:gap-1.5 sm:text-xs">
          <Bluetooth />
          {t('spp')}
        </TabsTrigger>
        <TabsTrigger value="os" className="h-11 min-w-0 flex-1 flex-col gap-1 px-1 text-[11px] sm:flex-row sm:gap-1.5 sm:text-xs">
          <Printer />
          {t('tabOsShort')}
        </TabsTrigger>
        <TabsTrigger value="tcp" className="h-11 min-w-0 flex-1 flex-col gap-1 px-1 text-[11px] sm:flex-row sm:gap-1.5 sm:text-xs">
          <Cable />
          {t('tabTcpShort')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="usb" className="space-y-4">
        <Toolbar
          hint={t('usbHint')}
          action={
            <Button type="button" size="sm" variant="outline" onClick={props.onRefreshUsb}>
              {t('refreshUsb')}
            </Button>
          }
        />
        <DeviceList
          devices={usbList}
          empty={t('usbEmptyHelp')}
          emptyIcon={Usb}
          selectedId={props.selectedId}
          subtitle={(device) => (device.usbVidPid ? `VID:PID ${device.usbVidPid}` : undefined)}
          onSelect={(device) => props.onSelect(device, usbBindingExtra(device))}
          {...listExtras}
        />
      </TabsContent>

      <TabsContent value="ble" className="space-y-4">
        <Toolbar
          hint={t('bleHint')}
          action={
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={props.scanning} onClick={props.onScanBle}>
                {props.scanning ? <Loader2 className="animate-spin" /> : <Bluetooth />}
                {props.scanning ? t('scanning') : t('scanBle')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pairing}
                onClick={() => void openPairing()}
              >
                {pairing ? t('pairing') : t('pairBluetooth')}
              </Button>
            </div>
          }
        />
        {bleList.length > 0 ? (
          <p className="text-ui-2xs text-ink-500">{t('devicesFound', { n: bleList.length })}</p>
        ) : null}
        {props.scanError ? (
          <Alert>
            <AlertDescription>{props.scanError}</AlertDescription>
          </Alert>
        ) : null}
        <DeviceList
          devices={bleList}
          empty={t('noBle')}
          emptyIcon={Bluetooth}
          scanning={props.scanning}
          selectedId={props.selectedId}
          subtitle={(device) => device.btAddress}
          stateFor={(device) =>
            resolveLinkState({
              printerId: device.id,
              printers: bleList,
              usbDevices: props.usbDevices,
              sppPorts: props.sppPorts,
              bleDevices: props.bleDevices,
            })
          }
          onSelect={(device) => props.onSelect(device, bleBindingExtra(device))}
          {...listExtras}
        />
      </TabsContent>

      <TabsContent value="spp" className="space-y-4">
        <Toolbar
          hint={t('bluetoothHint')}
          action={
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={props.onRefreshSpp}>
                {t('refreshSpp')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pairing}
                onClick={() => void openPairing()}
              >
                {pairing ? t('pairing') : t('pairBluetooth')}
              </Button>
            </div>
          }
        />
        <DeviceList
          devices={sppList}
          empty={t('sppEmpty')}
          emptyIcon={Bluetooth}
          selectedId={props.selectedId}
          subtitle={(device) => device.serialPort}
          onSelect={(device) => props.onSelect(device, serialBindingExtra(device))}
          {...listExtras}
        />
        <div className="grid gap-3 rounded-2xl border border-white/5 bg-ink-900/40 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <Field label={t('manualPort')}>
            <Input
              value={manualPort}
              onChange={(event) => setManualPort(event.target.value)}
              placeholder={t('manualPortPlaceholder')}
              className="border-white/10 bg-ink-950"
            />
          </Field>
          <Button
            type="button"
            disabled={!manualPort}
            onClick={() =>
              props.onSelect(
                {
                  id: `bt-spp:${manualPort}`,
                  name: `SPP ${manualPort}`,
                  systemName: manualPort,
                  isDefault: false,
                  status: 'unknown',
                  backend: 'bluetooth-spp',
                  serialPort: manualPort,
                },
                { serialPort: manualPort },
              )
            }
          >
            {t('useSpp')}
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="os" className="space-y-4">
        <Toolbar
          hint={t('setupOsHint')}
          action={
            <Button type="button" size="sm" variant="outline" onClick={props.onRefresh}>
              {t('refreshQueues')}
            </Button>
          }
        />
        <DeviceList
          devices={osPrinters}
          empty={t('noQueues')}
          emptyIcon={Printer}
          selectedId={props.selectedId}
          onSelect={(printer) => props.onSelect(printer)}
          {...listExtras}
        />
      </TabsContent>

      <TabsContent value="tcp" className="space-y-4">
        <DeviceList
          devices={tcpList}
          empty={t('tcpEmpty')}
          emptyIcon={Cable}
          selectedId={props.selectedId}
          subtitle={(device) =>
            device.tcpHost !== undefined && device.tcpPort !== undefined
              ? `${device.tcpHost}:${String(device.tcpPort)}`
              : undefined
          }
          onSelect={(device) =>
            props.onSelect(device, {
              ...(device.tcpHost !== undefined ? { tcpHost: device.tcpHost } : {}),
              ...(device.tcpPort !== undefined ? { tcpPort: device.tcpPort } : {}),
            })
          }
          {...listExtras}
        />
        <div className="grid gap-3 rounded-2xl border border-white/5 bg-ink-900/40 p-4 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end">
          <Field label={t('host')}>
            <Input
              value={tcpHost}
              onChange={(event) => setTcpHost(event.target.value)}
              className="border-white/10 bg-ink-950"
            />
          </Field>
          <Field label={t('port')}>
            <Input
              value={tcpPort}
              onChange={(event) => setTcpPort(event.target.value)}
              className="border-white/10 bg-ink-950"
            />
          </Field>
          <Button
            type="button"
            onClick={() => {
              const port = Number.parseInt(tcpPort, 10) || 9100;
              props.onSelect(
                {
                  id: `tcp:${tcpHost}:${port}`,
                  name: `${tcpHost}:${port}`,
                  systemName: `${tcpHost}:${port}`,
                  isDefault: false,
                  status: 'unknown',
                  backend: 'tcp',
                  tcpHost,
                  tcpPort: port,
                },
                { tcpHost, tcpPort: port },
              );
            }}
          >
            {t('useTcp')}
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function Toolbar(props: { hint: string; action: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <p className="max-w-2xl text-ui-xs leading-relaxed text-ink-400">{props.hint}</p>
      <div className="shrink-0">{props.action}</div>
    </div>
  );
}
