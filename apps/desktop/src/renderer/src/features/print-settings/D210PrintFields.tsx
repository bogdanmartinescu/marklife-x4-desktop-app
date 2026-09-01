import {
  D210_FEED_MM_MAX,
  D210_FEED_MM_MIN,
  D210_MEDIA_TYPES,
  D210_PROCESSING_MODES,
  isD210ContinuousMedia,
  isD210LabelMedia,
  type D210MediaType,
  type D210PrintSettings,
  type D210Processing,
  type PrinterProfile,
} from '@thermalbridge/printer-profiles';
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
import { useI18n } from '@/i18n/I18nProvider.js';
import type { MessageKey } from '@/i18n/messages.js';
import type { PrintDraft } from '@/state/types.js';

interface D210PrintFieldsProps {
  draft: PrintDraft;
  profile: PrinterProfile;
  onChange: (patch: Partial<PrintDraft>) => void;
}

const MEDIA_KEYS: Record<D210MediaType, MessageKey> = {
  continuous: 'd210MediaContinuous',
  label: 'd210MediaLabel',
  'folded-with-marks': 'd210MediaFoldedMarks',
  tattoo: 'd210MediaTattoo',
  'label-with-marks': 'd210MediaLabelMarks',
};

const PROCESSING_KEYS: Record<D210Processing, MessageKey> = {
  none: 'd210ProcessingNone',
  diffusion: 'd210ProcessingDiffusion',
  gathering: 'd210ProcessingGathering',
  'error-diffusion': 'd210ProcessingErrorDiffusion',
};

export function D210PrintFields(props: D210PrintFieldsProps) {
  const { t } = useI18n();
  const settings = props.draft.d210;
  const patchD210 = (patch: Partial<D210PrintSettings>): void => {
    props.onChange({ d210: { ...settings, ...patch } });
  };

  return (
    <>
      <Field label={t('d210Media')}>
        <Select
          value={settings.mediaType}
          onValueChange={(value) => patchD210({ mediaType: value as D210MediaType })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {D210_MEDIA_TYPES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {t(MEDIA_KEYS[mode])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {isD210LabelMedia(settings.mediaType) ? (
        <ToggleRow
          label={t('d210LocateBeforePage')}
          checked={settings.locateBeforeEveryPage}
          onChange={(checked) => patchD210({ locateBeforeEveryPage: checked })}
        />
      ) : null}
      {isD210ContinuousMedia(settings.mediaType) ? (
        <div className="grid grid-cols-2 gap-3">
          <FeedField
            label={t('d210FeedDocumentBegin')}
            value={settings.documentBeginMm}
            onChange={(documentBeginMm) => patchD210({ documentBeginMm })}
          />
          <FeedField
            label={t('d210FeedPageBegin')}
            value={settings.pageBeginMm}
            onChange={(pageBeginMm) => patchD210({ pageBeginMm })}
          />
          <FeedField
            label={t('d210FeedPageEnd')}
            value={settings.pageEndMm}
            onChange={(pageEndMm) => patchD210({ pageEndMm })}
          />
          <FeedField
            label={t('d210FeedDocumentEnd')}
            value={settings.documentEndMm}
            onChange={(documentEndMm) => patchD210({ documentEndMm })}
          />
        </div>
      ) : null}

      <Field
        label={`${t('d210Darkness')} (${props.draft.density})`}
        extra={
          <span className="text-[11px] text-muted-foreground">
            {t('vendorDefaultDensity', { value: props.profile.density.vendorDefault ?? 1 })}
          </span>
        }
      >
        <div className="flex gap-1">
          {([0, 1, 2] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="xs"
              variant={props.draft.density === value ? 'default' : 'outline'}
              className="flex-1 border-white/5"
              onClick={() => props.onChange({ density: value })}
            >
              {value}
            </Button>
          ))}
        </div>
        <Slider
          min={0}
          max={2}
          step={1}
          value={[props.draft.density]}
          onValueChange={(value) => props.onChange({ density: value[0] ?? 1 })}
        />
      </Field>
      <Field label={t('d210Processing')}>
        <Select
          value={settings.processing}
          onValueChange={(value) => patchD210({ processing: value as D210Processing })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {D210_PROCESSING_MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {t(PROCESSING_KEYS[mode])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </>
  );
}

export function D210AdvancedFields(props: D210PrintFieldsProps) {
  const { t } = useI18n();
  const settings = props.draft.d210;
  const patchD210 = (patch: Partial<D210PrintSettings>): void => {
    props.onChange({ d210: { ...settings, ...patch } });
  };
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('d210OffsetX')}>
          <Input
            type="number"
            min={props.profile.offsets.minXmm}
            max={props.profile.offsets.maxXmm}
            step={0.1}
            value={props.draft.offsetXmm}
            onChange={(event) => props.onChange({ offsetXmm: Number(event.target.value) })}
          />
        </Field>
        <Field label={t('d210OffsetY')}>
          <Input
            type="number"
            min={props.profile.offsets.minYmm}
            max={props.profile.offsets.maxYmm}
            step={0.1}
            value={props.draft.offsetYmm}
            onChange={(event) => props.onChange({ offsetYmm: Number(event.target.value) })}
          />
        </Field>
      </div>
      <ToggleRow
        label={t('d210SavePaperUp')}
        checked={settings.savePaperUp}
        onChange={(checked) => patchD210({ savePaperUp: checked })}
      />
      <ToggleRow
        label={t('d210SavePaperDown')}
        checked={settings.savePaperDown}
        onChange={(checked) => patchD210({ savePaperDown: checked })}
      />
    </>
  );
}

function FeedField(props: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <Field label={props.label}>
      <Input
        type="number"
        min={D210_FEED_MM_MIN}
        max={D210_FEED_MM_MAX}
        step={0.5}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
    </Field>
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
