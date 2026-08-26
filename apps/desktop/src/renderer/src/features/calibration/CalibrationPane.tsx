import { MARKLIFE_X4, PROFILES } from '@thermalbridge/printer-profiles';
import { Button } from '@/components/ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.js';
import { Input } from '@/components/ui/input.js';
import { Slider } from '@/components/ui/slider.js';
import { Field } from '@/components/field.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import type { PrintDraft } from '@/state/types.js';

interface CalibrationPaneProps {
  draft: PrintDraft;
  onChange: (patch: Partial<PrintDraft>) => void;
  onTest: () => void;
  onSave: () => void;
}

export function CalibrationPane(props: CalibrationPaneProps) {
  const { t } = useI18n();
  const profile = PROFILES.find((item) => item.id === props.draft.profileId) ?? MARKLIFE_X4;
  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <CardTitle>{t('calibrationTitle')}</CardTitle>
        <CardDescription>{t('calibrationHint')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('offsetX')}>
            <Input
              type="number"
              step="0.1"
              value={props.draft.offsetXmm}
              onChange={(event) => props.onChange({ offsetXmm: Number(event.target.value) })}
            />
          </Field>
          <Field label={t('offsetY')}>
            <Input
              type="number"
              step="0.1"
              value={props.draft.offsetYmm}
              onChange={(event) => props.onChange({ offsetYmm: Number(event.target.value) })}
            />
          </Field>
        </div>
        <Field label={`${t('density')} (${props.draft.density})`}>
          <Slider
            min={profile.density.min}
            max={profile.density.max}
            step={1}
            value={[props.draft.density]}
            onValueChange={(value) => props.onChange({ density: value[0] ?? profile.density.default })}
          />
        </Field>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={props.onTest}>
            {t('printTestPattern')}
          </Button>
          <Button type="button" onClick={props.onSave}>
            {t('saveForPrinter')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
