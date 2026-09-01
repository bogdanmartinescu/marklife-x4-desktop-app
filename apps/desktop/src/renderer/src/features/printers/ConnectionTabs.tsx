import { useState } from 'react';
import type { PrinterBinding, PrinterInfo } from '@thermalbridge/shared';
import { Bluetooth, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert.js';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.js';
import { Field } from '@/components/field.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import { DeviceList } from './DeviceList.js';
import {
  mergePrinterCatalog,
  resolveLinkState,
} from './connection-status.js';
import { bleBindingExtra, serialBindingExtra, usbBindingExtra } from './binding-extra.js';
import { sortLikelyPrintersFirst } from './likely-printer.js';

type Tab = 'os' | 'tcp' | 'usb' | 'bluetooth';
type BtMode = 'spp' | 'ble';

interface ConnectionTabsProps {
  printers: PrinterInfo[];
  usbDevices: PrinterInfo[];
  sppPorts: PrinterInfo[];
  bleDevices: PrinterInfo[];
  scanning: boolean;
  scanError?: string | null;
  selectedId: string;
  initialTab?: Tab;
  initialBtMode?: BtMode;
  onSelect: (printer: PrinterInfo, extra?: Partial<PrinterBinding>) => void;
  onRefresh: () => void;
  onRefreshUsb: () => void;
  onRefreshSpp: () => void;
  onScanBle: () => void;
  onOpenBluetoothPairing: () => Promise<void>;
}

export function ConnectionTabs(props: ConnectionTabsProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>(props.initialTab ?? 'usb');
  const [btMode, setBtMode] = useState<BtMode>(props.initialBtMode ?? 'ble');
  const [tcpHost, setTcpHost] = useState('192.168.1.80');
  const [tcpPort, setTcpPort] = useState('9100');
  const [manualPort, setManualPort] = useState('');
  const [pairing, setPairing] = useState(false);

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

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
      <TabsList variant="line" className="w-full flex-wrap justify-start">
        <TabsTrigger value="usb">{t('tabUsb')}</TabsTrigger>
        <TabsTrigger value="bluetooth">{t('tabBluetooth')}</TabsTrigger>
        <TabsTrigger value="os">{t('tabOs')}</TabsTrigger>
        <TabsTrigger value="tcp">{t('tabTcp')}</TabsTrigger>
      </TabsList>

      <TabsContent value="os" className="space-y-4 pt-4">
        <Button type="button" variant="outline" onClick={props.onRefresh}>
          {t('refreshQueues')}
        </Button>
        <DeviceList
          devices={osPrinters}
          empty={t('noQueues')}
          selectedId={props.selectedId}
          onSelect={(printer) => props.onSelect(printer)}
        />
      </TabsContent>

      <TabsContent value="tcp" className="space-y-4 pt-4">
        <Field label={t('host')}>
          <Input value={tcpHost} onChange={(event) => setTcpHost(event.target.value)} />
        </Field>
        <Field label={t('port')}>
          <Input value={tcpPort} onChange={(event) => setTcpPort(event.target.value)} />
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
      </TabsContent>

      <TabsContent value="usb" className="space-y-4 pt-4">
        <Alert>
          <AlertDescription>{t('usbHint')}</AlertDescription>
        </Alert>
        <Button type="button" variant="outline" onClick={props.onRefreshUsb}>
          {t('refreshUsb')}
        </Button>
        <DeviceList
          devices={usbList}
          empty={t('usbEmptyHelp')}
          selectedId={props.selectedId}
          subtitle={(device) => (device.usbVidPid ? `VID:PID ${device.usbVidPid}` : undefined)}
          onSelect={(device) => props.onSelect(device, usbBindingExtra(device))}
        />
      </TabsContent>

      <TabsContent value="bluetooth" className="space-y-3 pt-4">
        <Tabs value={btMode} onValueChange={(value) => setBtMode(value as BtMode)}>
          <TabsList>
            <TabsTrigger value="ble">{t('ble')}</TabsTrigger>
            <TabsTrigger value="spp">{t('spp')}</TabsTrigger>
          </TabsList>
          <TabsContent value="ble" className="space-y-3 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" disabled={props.scanning} onClick={props.onScanBle}>
                {props.scanning ? <Loader2 className="animate-spin" /> : <Bluetooth />}
                {props.scanning ? t('scanning') : t('scanBle')}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pairing}
                onClick={() => void openPairing()}
              >
                {pairing ? t('pairing') : t('pairBluetooth')}
              </Button>
              {bleList.length > 0 ? (
                <p className="ml-auto text-ui-xs text-ink-400">
                  {t('devicesFound', { n: bleList.length })}
                </p>
              ) : null}
            </div>
            {props.scanError ? (
              <Alert>
                <AlertDescription>{props.scanError}</AlertDescription>
              </Alert>
            ) : null}
            <DeviceList
              devices={bleList}
              empty={t('noBle')}
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
            />
            <details className="rounded-lg border border-white/5 bg-ink-850/40 px-3 py-2 text-ui-xs text-ink-400">
              <summary className="cursor-pointer select-none text-ink-300">{t('bleProtocolNotes')}</summary>
              <div className="mt-2 space-y-2 text-ink-400">
                <p>{t('x4BleUnsupported')}</p>
                <p>{t('bleHint')}</p>
              </div>
            </details>
          </TabsContent>
          <TabsContent value="spp" className="space-y-4 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={props.onRefreshSpp}>
                {t('refreshSpp')}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pairing}
                onClick={() => void openPairing()}
              >
                {pairing ? t('pairing') : t('pairBluetooth')}
              </Button>
            </div>
            <DeviceList
              devices={sppList}
              empty={t('sppEmpty')}
              selectedId={props.selectedId}
              subtitle={(device) => device.serialPort}
              onSelect={(device) => props.onSelect(device, serialBindingExtra(device))}
            />
            <Field label={t('manualPort')}>
              <Input
                value={manualPort}
                onChange={(event) => setManualPort(event.target.value)}
                placeholder={t('manualPortPlaceholder')}
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
            <details className="rounded-lg border border-white/5 bg-ink-850/40 px-3 py-2 text-ui-xs text-ink-400">
              <summary className="cursor-pointer select-none text-ink-300">{t('bleProtocolNotes')}</summary>
              <p className="mt-2">{t('protocol7Unimplemented')}</p>
            </details>
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  );
}
