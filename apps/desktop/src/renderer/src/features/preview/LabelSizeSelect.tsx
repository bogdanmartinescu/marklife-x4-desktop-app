import {
  DEFAULT_LABEL_SIZES,
  LABEL_MM_MAX,
  LABEL_MM_MIN,
  clampLabelMm,
  labelSizeKey,
  parseLabelSizeKey,
} from '@thermalbridge/printer-profiles';
import { Input } from '@/components/ui/input.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import { cn } from '@/lib/utils.js';

interface LabelSizeSelectProps {
  widthMm: number;
  heightMm: number;
  onChange: (size: { widthMm: number; heightMm: number }) => void;
  variant?: 'stack' | 'inline';
}

export function LabelSizeSelect(props: LabelSizeSelectProps) {
  const { t } = useI18n();
  const key = labelSizeKey(props.widthMm, props.heightMm);
  const known = DEFAULT_LABEL_SIZES.some(
    (size) => size.widthMm === props.widthMm && size.heightMm === props.heightMm,
  );

  const inline = props.variant === 'inline';

  return (
    <div className={cn(inline ? 'flex items-center gap-1.5' : 'grid gap-2')}>
      <Select
        value={key}
        onValueChange={(value) => {
          const parsed = parseLabelSizeKey(value);
          if (parsed) {
            props.onChange(parsed);
          }
        }}
      >
        <SelectTrigger
          size={inline ? 'sm' : 'default'}
          className={cn(inline ? 'h-8 w-[9.75rem] border-white/5 bg-ink-800' : 'w-full')}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper">
          {DEFAULT_LABEL_SIZES.map((size) => (
            <SelectItem
              key={labelSizeKey(size.widthMm, size.heightMm)}
              value={labelSizeKey(size.widthMm, size.heightMm)}
            >
              {size.displayName}
            </SelectItem>
          ))}
          {known ? null : (
            <SelectItem value={key}>
              {t('labelSizeCustom', { width: props.widthMm, height: props.heightMm })}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      <div className={cn(inline ? 'flex items-center gap-1' : 'grid grid-cols-2 gap-2')}>
        <Input
          type="number"
          min={LABEL_MM_MIN}
          max={LABEL_MM_MAX}
          step={0.1}
          aria-label={t('labelWidth')}
          value={props.widthMm}
          className={cn(inline && 'h-8 w-14 border-white/5 bg-ink-800 px-1.5 text-center font-mono text-ui-xs')}
          onChange={(event) => {
            const widthMm = Number(event.target.value);
            if (!Number.isFinite(widthMm) || widthMm <= 0) {
              return;
            }
            props.onChange({ widthMm: clampLabelMm(widthMm), heightMm: props.heightMm });
          }}
        />
        {inline ? <span className="text-ui-2xs text-ink-500">×</span> : null}
        <Input
          type="number"
          min={LABEL_MM_MIN}
          max={LABEL_MM_MAX}
          step={0.1}
          aria-label={t('labelHeight')}
          value={props.heightMm}
          className={cn(inline && 'h-8 w-14 border-white/5 bg-ink-800 px-1.5 text-center font-mono text-ui-xs')}
          onChange={(event) => {
            const heightMm = Number(event.target.value);
            if (!Number.isFinite(heightMm) || heightMm <= 0) {
              return;
            }
            props.onChange({ widthMm: props.widthMm, heightMm: clampLabelMm(heightMm) });
          }}
        />
      </div>
    </div>
  );
}
