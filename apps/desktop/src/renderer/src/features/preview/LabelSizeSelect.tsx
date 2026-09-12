import {
  labelSizeKey,
  labelSizesForMaxWidth,
  parseLabelSizeKey,
  type LabelSize,
  type LabelSizeGroup,
} from '@thermalbridge/printer-profiles';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import type { MessageKey } from '@/i18n/messages.js';
import { cn } from '@/lib/utils.js';

interface LabelSizeSelectProps {
  widthMm: number;
  heightMm: number;
  onChange: (size: { widthMm: number; heightMm: number }) => void;
  variant?: 'stack' | 'inline';
  maxWidthMm?: number;
  sizes?: readonly LabelSize[];
}

const GROUP_KEYS: Record<LabelSizeGroup, MessageKey> = {
  shipping: 'sizeGroupShipping',
  documents: 'sizeGroupDocuments',
  roll: 'sizeGroupRoll',
  labels: 'sizeGroupLabels',
};

const GROUP_ORDER: readonly LabelSizeGroup[] = ['shipping', 'documents', 'roll', 'labels'];

export function LabelSizeSelect(props: LabelSizeSelectProps) {
  const { t } = useI18n();
  const key = labelSizeKey(props.widthMm, props.heightMm);
  const sizes = props.sizes ?? labelSizesForMaxWidth(props.maxWidthMm);
  const listed = sizes.some(
    (size) => size.widthMm === props.widthMm && size.heightMm === props.heightMm,
  );
  const grouped = sizes.some((size) => size.group !== undefined);
  const inline = props.variant === 'inline';

  return (
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
        className={cn(inline ? 'h-8 w-[10rem] shrink-0 border-white/5 bg-ink-800' : 'w-full')}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        {grouped
          ? GROUP_ORDER.map((group) => {
              const items = sizes.filter((size) => size.group === group);
              if (items.length === 0) {
                return null;
              }
              return (
                <div key={group}>
                  <p className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-500">
                    {t(GROUP_KEYS[group])}
                  </p>
                  {items.map((size) => (
                    <SelectItem
                      key={labelSizeKey(size.widthMm, size.heightMm)}
                      value={labelSizeKey(size.widthMm, size.heightMm)}
                    >
                      {size.displayName}
                    </SelectItem>
                  ))}
                </div>
              );
            })
          : sizes.map((size) => (
              <SelectItem
                key={labelSizeKey(size.widthMm, size.heightMm)}
                value={labelSizeKey(size.widthMm, size.heightMm)}
              >
                {size.displayName}
              </SelectItem>
            ))}
        {listed ? null : (
          <SelectItem value={key}>
            {t('labelSizeCustom', { width: props.widthMm, height: props.heightMm })}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
