import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import { PRINT_ICONS } from './icon-catalog.js';
import { nextIconIndex } from './icon-grid-nav.js';

interface EditorIconPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (iconId: string) => void;
}

const COLUMNS = 5;

export function EditorIconPicker(props: EditorIconPickerProps) {
  const { t } = useI18n();
  const [active, setActive] = useState(0);
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!props.open) {
      setActive(0);
      return;
    }
    const button = buttonsRef.current[0];
    button?.focus();
  }, [props.open]);

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent
        showCloseButton={false}
        className="top-[12vh] w-full max-w-lg translate-y-0 gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle>{t('editorIconPickerTitle')}</DialogTitle>
        </DialogHeader>
        <div
          className="grid max-h-[min(28rem,60vh)] grid-cols-4 gap-2 overflow-auto p-3 sm:grid-cols-5"
          role="listbox"
          aria-label={t('editorIconPickerTitle')}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              const icon = PRINT_ICONS[active];
              if (icon) {
                props.onPick(icon.id);
                props.onClose();
              }
              return;
            }
            const next = nextIconIndex(active, event.key, PRINT_ICONS.length, COLUMNS);
            if (next !== active) {
              event.preventDefault();
              setActive(next);
              buttonsRef.current[next]?.focus();
            }
          }}
        >
          {PRINT_ICONS.map((icon, index) => (
            <button
              key={icon.id}
              ref={(node) => {
                buttonsRef.current[index] = node;
              }}
              type="button"
              role="option"
              aria-selected={index === active}
              tabIndex={index === active ? 0 : -1}
              className="flex flex-col items-center gap-1 rounded-xl border border-white/5 px-2 py-3 text-ink-100 hover:bg-ink-750 focus-visible:ring-2 focus-visible:ring-primary/40"
              onClick={() => {
                props.onPick(icon.id);
                props.onClose();
              }}
            >
              <svg viewBox={`0 0 ${String(icon.viewBox)} ${String(icon.viewBox)}`} className="size-8">
                {icon.fill.map((d) => (
                  <path key={d} d={d} fill="currentColor" fillRule="evenodd" />
                ))}
                {icon.stroke.map((d) => (
                  <path
                    key={d}
                    d={d}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={icon.strokeWidth}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}
              </svg>
              <span className="max-w-full truncate text-center text-ui-2xs text-ink-400">
                {t(icon.labelKey)}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
