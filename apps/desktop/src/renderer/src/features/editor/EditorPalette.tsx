import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Barcode,
  CalendarClock,
  Circle,
  Copy,
  Grid3x3,
  ImageIcon,
  Minus,
  QrCode,
  Square,
  Table,
  Trash2,
  TriangleAlert,
  Type,
} from 'lucide-react';
import { Input } from '@/components/ui/input.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import type { MessageKey } from '@/i18n/messages.js';

interface EditorPaletteProps {
  open: boolean;
  onClose: () => void;
  onAddText: () => void;
  onAddQr: () => void;
  onAddBarcode: () => void;
  onAddRect: () => void;
  onAddLine: () => void;
  onAddCircle: () => void;
  onAddArrow: () => void;
  onAddIcon: () => void;
  onAddImage: () => void;
  onAddTable: () => void;
  onAddField: () => void;
  onDuplicate: () => void;
  onDeleteSelected: () => void;
  onToggleGrid: () => void;
}

interface PaletteCommand {
  id: string;
  labelKey: MessageKey;
  shortcut: string;
  icon: typeof Type;
  run: () => void;
}

export function EditorPalette(props: EditorPaletteProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const commands: PaletteCommand[] = useMemo(
    () => [
      { id: 'text', labelKey: 'editorAddText', shortcut: 'T', icon: Type, run: props.onAddText },
      { id: 'qr', labelKey: 'editorAddQr', shortcut: 'Q', icon: QrCode, run: props.onAddQr },
      {
        id: 'barcode',
        labelKey: 'editorAddBarcode',
        shortcut: 'B',
        icon: Barcode,
        run: props.onAddBarcode,
      },
      { id: 'rect', labelKey: 'editorAddBox', shortcut: 'R', icon: Square, run: props.onAddRect },
      { id: 'line', labelKey: 'editorAddLine', shortcut: 'L', icon: Minus, run: props.onAddLine },
      { id: 'circle', labelKey: 'editorAddCircle', shortcut: 'O', icon: Circle, run: props.onAddCircle },
      { id: 'arrow', labelKey: 'editorAddArrow', shortcut: 'A', icon: ArrowRight, run: props.onAddArrow },
      { id: 'icon', labelKey: 'editorAddIcon', shortcut: 'S', icon: TriangleAlert, run: props.onAddIcon },
      { id: 'image', labelKey: 'editorAddImage', shortcut: 'I', icon: ImageIcon, run: props.onAddImage },
      { id: 'table', labelKey: 'editorAddTable', shortcut: 'E', icon: Table, run: props.onAddTable },
      { id: 'field', labelKey: 'editorAddField', shortcut: 'F', icon: CalendarClock, run: props.onAddField },
      { id: 'dup', labelKey: 'editorDuplicate', shortcut: '⌘D', icon: Copy, run: props.onDuplicate },
      { id: 'del', labelKey: 'editorDelete', shortcut: '⌫', icon: Trash2, run: props.onDeleteSelected },
      { id: 'grid', labelKey: 'editorGrid', shortcut: 'G', icon: Grid3x3, run: props.onToggleGrid },
    ],
    [
      props.onAddArrow,
      props.onAddBarcode,
      props.onAddCircle,
      props.onAddField,
      props.onAddIcon,
      props.onAddImage,
      props.onAddLine,
      props.onAddQr,
      props.onAddRect,
      props.onAddTable,
      props.onAddText,
      props.onDeleteSelected,
      props.onDuplicate,
      props.onToggleGrid,
    ],
  );
  const filtered = commands.filter((item) => {
    const haystack = `${t(item.labelKey)} ${item.shortcut}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  useEffect(() => {
    if (!props.open) {
      setQuery('');
    }
  }, [props.open]);

  if (!props.open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[15vh]"
      onClick={props.onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/5 bg-ink-800 shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b p-2">
          <Input
            autoFocus
            value={query}
            placeholder={t('editorPalettePlaceholder')}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                props.onClose();
              }
              if (event.key === 'Enter') {
                const first = filtered[0];
                if (first) {
                  first.run();
                  props.onClose();
                }
              }
            }}
          />
        </div>
        <ul className="max-h-72 overflow-auto p-1">
          {filtered.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-ui-sm hover:bg-ink-750"
                  onClick={() => {
                    item.run();
                    props.onClose();
                  }}
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="flex-1">{t(item.labelKey)}</span>
                  <kbd className="text-[10px] text-muted-foreground">{item.shortcut}</kbd>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
