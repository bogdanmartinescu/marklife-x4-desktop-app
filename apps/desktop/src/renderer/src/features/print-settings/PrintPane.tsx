import { MARKLIFE_X4, PROFILES } from '@thermalbridge/printer-profiles';
import type { PrinterInfo } from '@thermalbridge/shared';
import { Bluetooth } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert.js';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js';
import { Slider } from '@/components/ui/slider.js';
import { Switch } from '@/components/ui/switch.js';
import { Field } from '@/components/field.js';
import { LabelSizeSelect } from '@/features/preview/LabelSizeSelect.js';
import { ConnectionStatusBadge } from '@/features/printers/ConnectionStatusBadge.js';
import type { LinkState } from '@/features/printers/connection-status.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import { cn } from '@/lib/utils.js';
import type { PrintDraft } from '@/state/types.js';

interface PrintPaneProps {
  draft: PrintDraft;
  printers: PrinterInfo[];
  linkState: LinkState;
  busy: boolean;
  status: string;
  onChange: (patch: Partial<PrintDraft>) => void;
  onPrint: () => void;
  onTest: () => void;
  onConnectPrinter: () => void;
  className?: string;
}

const NONE = '__none__';

export function PrintPane(props: PrintPaneProps) {
  const { t } = useI18n();
  const profile = PROFILES.find((item) => item.id === props.draft.profileId) ?? MARKLIFE_X4;
  const selectedPrinter = props.printers.find((item) => item.id === props.draft.printerId);
  const isX4 = props.draft.profileId === MARKLIFE_X4.id;
  const isSpp = selectedPrinter?.backend === 'bluetooth-spp';
  const isBle = selectedPrinter?.backend === 'bluetooth-ble';
  const planned = profile.status === 'planned';
  const printDisabled = props.busy || planned;

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/5 bg-ink-800/95 py-3 shadow-panel backdrop-blur-md',
        props.className,
      )}
    >
      <div className="px-4 pb-3">
        <h2 className="text-ui-md font-semibold tracking-tight">{t('printTitle')}</h2>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto px-4">
        <Field
          label={t('printer')}
          extra={
            <div className="flex items-center gap-2">
              {props.draft.printerId ? <ConnectionStatusBadge state={props.linkState} /> : null}
              <Button
                type="button"
                size="xs"
                variant="outline"
                className="border-white/5 bg-ink-750"
                onClick={props.onConnectPrinter}
              >
                <Bluetooth />
                {t('connectPrinter')}
              </Button>
            </div>
          }
        >
          <Select
            value={props.draft.printerId || NONE}
            onValueChange={(value) => props.onChange({ printerId: value === NONE ? '' : value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('selectPrinter')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t('selectPrinter')}</SelectItem>
              {props.printers.map((printer) => (
                <SelectItem key={printer.id} value={printer.id}>
                  {printer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {isX4 && isSpp ? (
          <Alert>
            <AlertDescription>{t('protocol7Unimplemented')}</AlertDescription>
          </Alert>
        ) : null}
        {isX4 && isSpp ? (
          <label className="flex items-start gap-2.5 text-sm leading-snug">
            <Switch
              className="mt-0.5"
              checked={props.draft.diagnosticTsplOverSpp}
              onCheckedChange={(checked) => props.onChange({ diagnosticTsplOverSpp: checked })}
            />
            <span>
              {t('diagnosticTsplOverSpp')}
              <span className="mt-1 block text-xs text-muted-foreground">
                {t('diagnosticTsplOverSppHint')}
              </span>
            </span>
          </label>
        ) : null}
        {isX4 && isBle ? (
          <Alert>
            <AlertDescription>{t('x4BleUnsupported')}</AlertDescription>
          </Alert>
        ) : null}
        {planned ? (
          <Alert>
            <AlertDescription>{t('profilePlanned', { name: profile.displayName })}</AlertDescription>
          </Alert>
        ) : null}
        <Field label={t('profile')}>
          <Select
            value={props.draft.profileId}
            onValueChange={(value) => props.onChange({ profileId: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROFILES.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.status === 'planned'
                    ? `${item.displayName} (${t('comingSoon')})`
                    : item.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('size')}>
          <LabelSizeSelect
            widthMm={props.draft.widthMm}
            heightMm={props.draft.heightMm}
            onChange={(size) => props.onChange(size)}
          />
        </Field>
        <Field label={t('media')}>
          <Select
            value={props.draft.mediaMode}
            onValueChange={(value) =>
              props.onChange({ mediaMode: value as PrintDraft['mediaMode'] })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gap">{t('mediaGap')}</SelectItem>
              <SelectItem value="black-mark">{t('mediaBlackMark')}</SelectItem>
              <SelectItem value="continuous">{t('mediaContinuous')}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {props.draft.mediaMode === 'gap' ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('gapMm')}>
              <Input
                type="number"
                value={props.draft.gapHeightMm}
                onChange={(event) => props.onChange({ gapHeightMm: Number(event.target.value) })}
              />
            </Field>
            <Field label={t('offsetMm')}>
              <Input
                type="number"
                value={props.draft.gapOffsetMm}
                onChange={(event) => props.onChange({ gapOffsetMm: Number(event.target.value) })}
              />
            </Field>
          </div>
        ) : null}
        <Field
          label={`${t('density')} (${props.draft.density})`}
          extra={
            profile.density.vendorDefault !== undefined ? (
              <span className="text-[11px] text-muted-foreground">
                {t('vendorDefaultDensity', { value: profile.density.vendorDefault })}
              </span>
            ) : null
          }
        >
          <Slider
            min={profile.density.min}
            max={profile.density.max}
            step={1}
            value={[props.draft.density]}
            onValueChange={(value) => props.onChange({ density: value[0] ?? profile.density.default })}
          />
        </Field>
        <Field label={t('speed')}>
          <Select
            value={String(props.draft.speed)}
            onValueChange={(value) => props.onChange({ speed: Number(value) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {profile.speed.values.map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('copies')}>
          <Input
            type="number"
            min={1}
            value={props.draft.copies}
            onChange={(event) => props.onChange({ copies: Number(event.target.value) })}
          />
        </Field>
        <Field label={t('raster')}>
          <Select
            value={props.draft.dither}
            onValueChange={(value) =>
              props.onChange({ dither: value as PrintDraft['dither'] })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="threshold">{t('rasterThreshold')}</SelectItem>
              <SelectItem value="floyd-steinberg">{t('rasterFloyd')}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="mt-auto shrink-0 flex-col items-stretch gap-3 border-t border-white/5 px-4 pt-3">
        <div className="flex gap-2">
          <Button className="flex-1" disabled={printDisabled} onClick={props.onPrint}>
            {props.busy ? t('printing') : t('print')}
          </Button>
          <Button
            variant="outline"
            className="border-white/5 bg-ink-750"
            disabled={printDisabled}
            onClick={props.onTest}
          >
            {t('testPage')}
          </Button>
        </div>
        {props.status ? <p className="mt-3 text-ui-xs text-ink-400">{props.status}</p> : null}
      </div>
    </div>
  );
}
