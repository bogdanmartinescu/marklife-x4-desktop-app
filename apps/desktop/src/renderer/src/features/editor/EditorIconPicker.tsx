import { PRINT_ICONS } from './icon-catalog.js';
import { useI18n } from '@/i18n/I18nProvider.js';

interface EditorIconPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (iconId: string) => void;
}

export function EditorIconPicker(props: EditorIconPickerProps) {
  const { t } = useI18n();
  if (!props.open) {
    return null;
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh]"
      onClick={props.onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/5 bg-ink-800 shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b px-4 py-3 text-sm font-medium">{t('editorIconPickerTitle')}</div>
        <div className="grid max-h-[min(28rem,60vh)] grid-cols-4 gap-2 overflow-auto p-3 sm:grid-cols-5">
          {PRINT_ICONS.map((icon) => (
            <button
              key={icon.id}
              type="button"
              className="flex flex-col items-center gap-1 rounded-xl border border-white/5 px-2 py-3 text-ink-100 hover:bg-ink-750"
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
      </div>
    </div>
  );
}
