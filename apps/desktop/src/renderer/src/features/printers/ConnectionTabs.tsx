import { useState } from 'react';
import type { PrinterBinding, PrinterBackend, PrinterInfo } from '@thermalbridge/shared';
import { Bluetooth } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert.js';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.js';
import { Field } from '@/components/field.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import type { MessageKey } from '@/i18n/messages.js';
import { ConnectionStatusBadge } from './ConnectionStatusBadge.js';
import {
  linkStateFromDevice,
  mergePrinterCatalog,
  resolveLinkState,
  type LinkState,
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

const BACKEND_KEYS: Record<PrinterBackend, MessageKey> = {
  'windows-spooler': 'backendWindows',
  cups: 'backendCups',
  tcp: 'backendTcp',
  usb: 'backendUsb',
  'bluetooth-spp': 'backendSpp',
  'bluetooth-ble': 'backendBle',
};

export function ConnectionTabs(props: ConnectionTabsProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>(props.initialTab ?? 'usb');
  const [btMode, setBtMode] = useState<BtMode>(props.initialBtMode ?? 'spp');
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
      <TabsList variant="line" className="w-full justify-start">
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

      <TabsContent value="bluetooth" className="space-y-4 pt-4">
        <Alert>
          <AlertDescription>{t('bluetoothHint')}</AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={pairing} onClick={() => void openPairing()}>
            <Bluetooth />
            {pairing ? t('pairing') : t('pairBluetooth')}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t('pairBluetoothHint')}</p>
        <Tabs value={btMode} onValueChange={(value) => setBtMode(value as BtMode)}>
          <TabsList>
            <TabsTrigger value="spp">{t('spp')}</TabsTrigger>
            <TabsTrigger value="ble">{t('ble')}</TabsTrigger>
          </TabsList>
          <TabsContent value="spp" className="space-y-4 pt-4">
            <Alert>
              <AlertDescription>{t('protocol7Unimplemented')}</AlertDescription>
            </Alert>
            <Button type="button" variant="outline" onClick={props.onRefreshSpp}>
              {t('refreshSpp')}
            </Button>
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
          </TabsContent>
          <TabsContent value="ble" className="space-y-4 pt-4">
            <Alert>
              <AlertDescription>{t('x4BleUnsupported')}</AlertDescription>
            </Alert>
            <Alert>
              <AlertDescription>{t('bleHint')}</AlertDescription>
            </Alert>
            <Button type="button" disabled={props.scanning} onClick={props.onScanBle}>
              {props.scanning ? t('scanning') : t('scanBle')}
            </Button>
            {props.scanError ? (
              <Alert>
                <AlertDescription>{props.scanError}</AlertDescription>
              </Alert>
            ) : null}
            <DeviceList
              devices={bleList}
              empty={t('noBle')}
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
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  );
}

function DeviceList(props: {
  devices: PrinterInfo[];
  empty: string;
  selectedId: string;
  subtitle?: (device: PrinterInfo) => string | undefined;
  stateFor?: (device: PrinterInfo) => LinkState;
  onSelect: (device: PrinterInfo) => void;
}) {
  const { t } = useI18n();
  if (props.devices.length === 0) {
    return <p className="text-sm text-muted-foreground">{props.empty}</p>;
  }

  return (
    <ul className="divide-y rounded-md border">
      {props.devices.map((device) => {
        const state = props.stateFor?.(device) ?? linkStateFromDevice(device);
        const subtitle = props.subtitle?.(device);
        return (
          <li key={device.id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium">{device.name}</p>
                <ConnectionStatusBadge state={state} />
              </div>
              <p className="text-xs text-muted-foreground">
                {t(BACKEND_KEYS[device.backend])}
                {subtitle ? ` · ${subtitle}` : ''}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={props.selectedId === device.id ? 'default' : 'outline'}
              onClick={() => props.onSelect(device)}
            >
              {props.selectedId === device.id ? t('selected') : t('select')}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
