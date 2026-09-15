import {
  inferPrinterProfile,
  MARKLIFE_D210,
  MARKLIFE_X4,
  PROFILES,
  profileUsesMediaDimensions,
  resolveRoute,
  type MediaMode,
  type TransportKind,
} from '@thermalbridge/printer-profiles';
import type { FitMode, Rotation } from '@thermalbridge/thermal-core';
import type { PrinterInfo } from '@thermalbridge/shared';
import { HelpCircle, RotateCcw, RotateCw, Sparkles, Undo2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button.js';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.js';
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
import { ConnectionStatusBadge } from '@/features/printers/ConnectionStatusBadge.js';
import type { LinkState } from '@/features/printers/connection-status.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import type { MessageKey } from '@/i18n/messages.js';
import { cn } from '@/lib/utils.js';
import type { PrintDraft } from '@/state/types.js';
import { D210AdvancedFields, D210PrintFields } from './D210PrintFields.js';

function rotateCw(r: Rotation): Rotation {
  return ((r + 90) % 360) as Rotation;
}
function rotateCcw(r: Rotation): Rotation {
  return ((r + 270) % 360) as Rotation;
}

interface PrintPaneProps {
  draft: PrintDraft;
  printers: PrinterInfo[];
  linkState: LinkState;
  busy: boolean;
  status: string;
  onChange: (patch: Partial<PrintDraft>) => void;
  onTest: () => void;
  className?: string;
  // Image section
  fitMode: FitMode;
  rotation: Rotation;
  hasSource: boolean;
  sourceIsPdf: boolean;
  isEnhanced: boolean;
  contentScalePercent: number | null;
  contentScaleMin: number;
  contentScaleMax: number;
  onFitMode: (mode: FitMode) => void;
  onRotation: (rotation: Rotation) => void;
  onContentScale: (percent: number) => void;
  onEnhance: () => void;
  onRevertEnhance: () => void;
}

const NONE = '__none__';

const MEDIA_KEYS: Record<MediaMode, MessageKey> = {
  gap: 'mediaGap',
  'black-mark': 'mediaBlackMark',
  continuous: 'mediaContinuous',
};

const LANGUAGE_KEYS: Record<'tspl' | 'esc-pos' | 'os-document' | 'unknown', MessageKey> = {
  tspl: 'profileLanguageTspl',
  'esc-pos': 'profileLanguageEscPos',
  'os-document': 'profileLanguageOsDocument',
  unknown: 'profileLanguageUnknown',
};

export function PrintPane(props: PrintPaneProps) {
  const { t } = useI18n();
  const profile = PROFILES.find((item) => item.id === props.draft.profileId) ?? MARKLIFE_X4;
  const selectedPrinter = props.printers.find((item) => item.id === props.draft.printerId);
  const isX4 = props.draft.profileId === MARKLIFE_X4.id;
  const isD210 = props.draft.profileId === MARKLIFE_D210.id;
  const isOsDocument = profile.language === 'os-document';
  const isSpp = selectedPrinter?.backend === 'bluetooth-spp';
  const transport = selectedPrinter?.backend as TransportKind | undefined;
  const resolvedRoute =
    transport === undefined
      ? undefined
      : resolveRoute({ modelId: props.draft.profileId, transport });
  const unsupportedReason =
    resolvedRoute?.kind === 'unsupported' ? resolvedRoute.reason : undefined;
  const planned = profile.status === 'planned';
  const mediaModes = profile.mediaModes;
  const usesMediaDimensions = profileUsesMediaDimensions(profile);
  const languageBits = [
    t(LANGUAGE_KEYS[profile.language]),
    t('profileDpi', { n: profile.dpi }),
    ...(profile.maxWidthMm !== undefined
      ? [t('profileHeadWidth', { n: profile.maxWidthMm })]
      : []),
  ];

  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden bg-ink-900 py-3',
        props.className,
      )}
    >
      <div className="px-4 pb-3">
        <h2 className="text-ui-md font-semibold tracking-tight">{t('printTitle')}</h2>
        <p className="mt-0.5 text-ui-2xs text-ink-500">{languageBits.join(' · ')}</p>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-auto px-4">
        <Section title={t('printSectionPrinter')}>
          <Field
            label={t('printer')}
            extra={
              <span className="flex items-center gap-1.5">
                {props.draft.printerId ? <ConnectionStatusBadge state={props.linkState} /> : null}
                {isX4 && isSpp ? <HelpTooltip text={t('protocol7Unimplemented')} /> : null}
                {unsupportedReason ? <HelpTooltip text={unsupportedReason} /> : null}
              </span>
            }
          >
            <Select
              value={props.draft.printerId || NONE}
              onValueChange={(value) => {
                if (value === NONE) {
                  props.onChange({ printerId: '' });
                  return;
                }
                const printer = props.printers.find((item) => item.id === value);
                const inferred =
                  printer !== undefined ? inferPrinterProfile(printer) : undefined;
                props.onChange({
                  printerId: value,
                  ...(inferred !== undefined ? { profileId: inferred } : {}),
                });
              }}
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
            <label className="flex items-center gap-2.5 text-sm">
              <Switch
                checked={props.draft.diagnosticTsplOverSpp}
                onCheckedChange={(checked) => props.onChange({ diagnosticTsplOverSpp: checked })}
              />
              <span className="flex items-center gap-1">
                {t('diagnosticTsplOverSpp')}
                <HelpTooltip text={t('diagnosticTsplOverSppHint')} />
              </span>
            </label>
          ) : null}
          <Field
            label={t('profile')}
            extra={planned ? <HelpTooltip text={t('profilePlanned', { name: profile.displayName })} /> : undefined}
          >
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
        </Section>

        <Section title={t('printSectionMedia')}>
          {isD210 ? (
            <D210PrintFields draft={props.draft} profile={profile} onChange={props.onChange} />
          ) : (
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
                  {mediaModes.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {t(MEDIA_KEYS[mode])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          {usesMediaDimensions && props.draft.mediaMode === 'gap' ? (
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
          {usesMediaDimensions && props.draft.mediaMode === 'black-mark' ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('markHeightMm')}>
                <Input
                  type="number"
                  value={props.draft.markHeightMm}
                  onChange={(event) => props.onChange({ markHeightMm: Number(event.target.value) })}
                />
              </Field>
              <Field label={t('markOffsetMm')}>
                <Input
                  type="number"
                  value={props.draft.markOffsetMm}
                  onChange={(event) => props.onChange({ markOffsetMm: Number(event.target.value) })}
                />
              </Field>
            </div>
          ) : null}
        </Section>

        {/* ── Image section ─────────────────────────────────────────────────── */}
        <Section title={t('printSectionImage')}>
          <Field label={t('fit')}>
            <Select
              value={props.fitMode}
              onValueChange={(v) => props.onFitMode(v as FitMode)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fit">{t('fitFit')}</SelectItem>
                <SelectItem value="fill">{t('fitFill')}</SelectItem>
                <SelectItem value="actual">{t('fitActual')}</SelectItem>
                <SelectItem value="stretch">{t('fitStretch')}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {profile.transforms.rotation ? (
            <Field label={`${t('rotateLabel')} (${props.rotation}°)`}>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  className="flex-1 border-white/5"
                  aria-label="Rotate left 90°"
                  onClick={() => props.onRotation(rotateCcw(props.rotation))}
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  −90°
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  className="flex-1 border-white/5"
                  aria-label="Rotate right 90°"
                  onClick={() => props.onRotation(rotateCw(props.rotation))}
                >
                  +90°
                  <RotateCw className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </Field>
          ) : null}

          {props.contentScalePercent !== null ? (
            <Field label={`${t('scalePct')} (${props.contentScalePercent}%)`}>
              <div className="flex items-center gap-2">
                <Slider
                  min={props.contentScaleMin}
                  max={props.contentScaleMax}
                  step={1}
                  value={[props.contentScalePercent]}
                  className="flex-1"
                  onValueChange={(value) => props.onContentScale(value[0] ?? 100)}
                />
                <Input
                  type="number"
                  min={props.contentScaleMin}
                  max={props.contentScaleMax}
                  value={props.contentScalePercent}
                  className="w-16 shrink-0 text-center"
                  onChange={(event) => {
                    const v = Number(event.target.value);
                    if (Number.isFinite(v) && v > 0) {
                      props.onContentScale(Math.min(props.contentScaleMax, Math.max(props.contentScaleMin, v)));
                    }
                  }}
                />
              </div>
            </Field>
          ) : null}

          {props.hasSource && !props.sourceIsPdf && !isOsDocument ? (
            props.isEnhanced ? (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md border border-white/5 bg-ink-800/60 px-2.5 py-2 text-ui-sm transition-colors hover:bg-ink-750"
                onClick={props.onRevertEnhance}
              >
                <Undo2 className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                {t('photoCleanupRevert')}
              </button>
            ) : (
              <button
                type="button"
                title={t('enhanceImageHint')}
                className="flex w-full items-center gap-2 rounded-md border border-white/5 bg-ink-800/60 px-2.5 py-2 text-ui-sm transition-colors hover:bg-ink-750"
                onClick={props.onEnhance}
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                {t('enhanceImage')}
              </button>
            )
          ) : null}
        </Section>

        {isD210 || isOsDocument ? null : (
        <Section title={t('printSectionQuality')}>
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
            <div className="flex gap-1">
              {(
                [
                  ['densityLight', profile.density.presets.light],
                  ['densityNormal', profile.density.presets.normal],
                  ['densityDark', profile.density.presets.dark],
                ] as const
              ).map(([key, value]) => (
                <Button
                  key={key}
                  type="button"
                  size="xs"
                  variant={props.draft.density === value ? 'default' : 'outline'}
                  className="flex-1 border-white/5"
                  onClick={() => props.onChange({ density: value })}
                >
                  {t(key)}
                </Button>
              ))}
            </div>
            <Slider
              min={profile.density.min}
              max={profile.density.max}
              step={1}
              value={[props.draft.density]}
              onValueChange={(value) =>
                props.onChange({ density: value[0] ?? profile.density.default })
              }
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
        </Section>
        )}

        <Section title={t('printSectionOutput')}>
          <Field label={t('copies')}>
            <Input
              type="number"
              min={1}
              value={props.draft.copies}
              onChange={(event) => props.onChange({ copies: Number(event.target.value) })}
            />
          </Field>
          {!isD210 && profile.transforms.mirror ? (
            <div className="grid grid-cols-2 gap-3">
              <ToggleRow
                label={t('mirrorX')}
                checked={props.draft.mirrorX}
                onChange={(checked) => props.onChange({ mirrorX: checked })}
              />
              <ToggleRow
                label={t('mirrorY')}
                checked={props.draft.mirrorY}
                onChange={(checked) => props.onChange({ mirrorY: checked })}
              />
            </div>
          ) : null}
          {!isD210 && profile.transforms.negative ? (
            <ToggleRow
              label={t('negative')}
              checked={props.draft.negative}
              onChange={(checked) => props.onChange({ negative: checked })}
            />
          ) : null}
        </Section>
        {isD210 ? (
          <Section title={t('printSectionAdvanced')}>
            {profile.transforms.mirror ? (
              <div className="grid grid-cols-2 gap-3">
                <ToggleRow
                  label={t('mirrorX')}
                  checked={props.draft.mirrorX}
                  onChange={(checked) => props.onChange({ mirrorX: checked })}
                />
                <ToggleRow
                  label={t('mirrorY')}
                  checked={props.draft.mirrorY}
                  onChange={(checked) => props.onChange({ mirrorY: checked })}
                />
              </div>
            ) : null}
            {profile.transforms.negative ? (
              <ToggleRow
                label={t('negative')}
                checked={props.draft.negative}
                onChange={(checked) => props.onChange({ negative: checked })}
              />
            ) : null}
            <D210AdvancedFields draft={props.draft} profile={profile} onChange={props.onChange} />
          </Section>
        ) : null}
      </div>
      {props.status ? (
        <div className="mt-auto flex shrink-0 flex-col items-stretch border-t border-white/5 px-4 pt-3">
          <p className="text-ui-xs text-ink-400">{props.status}</p>
        </div>
      ) : null}
    </div>
  );
}

function Section(props: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3.5">
      <h3 className="text-ui-2xs font-semibold uppercase tracking-wider text-ink-400">{props.title}</h3>
      {props.children}
    </section>
  );
}

function ToggleRow(props: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-md border border-white/5 bg-ink-800/60 px-2.5 py-2 text-ui-sm">
      <span>{props.label}</span>
      <Switch checked={props.checked} onCheckedChange={props.onChange} />
    </label>
  );
}

function HelpTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Help"
          className="text-ink-500 transition-colors hover:text-ink-300"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
