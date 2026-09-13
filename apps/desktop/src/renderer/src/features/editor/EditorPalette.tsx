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
import { commandSpec, menuLabel, type MenuActionId } from '@thermalbridge/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.js';
import { Input } from '@/components/ui/input.js';
import { displayAccelerator } from '@/features/commands/accelerator-display.js';
import { useI18n } from '@/i18n/I18nProvider.js';

interface EditorPaletteProps {
  open: boolean;
  onClose: () => void;
  run: (id: MenuActionId) => void;
}

const PALETTE_ACTIONS: Array<{ id: MenuActionId; icon: typeof Type }> = [
  { id: 'insert.text', icon: Type },
  { id: 'insert.qr', icon: QrCode },
  { id: 'insert.barcode', icon: Barcode },
  { id: 'insert.box', icon: Square },
  { id: 'insert.line', icon: Minus },
  { id: 'insert.circle', icon: Circle },
  { id: 'insert.arrow', icon: ArrowRight },
  { id: 'insert.icon', icon: TriangleAlert },
  { id: 'insert.image', icon: ImageIcon },
  { id: 'insert.table', icon: Table },
  { id: 'insert.field', icon: CalendarClock },
  { id: 'edit.duplicate', icon: Copy },
  { id: 'edit.delete', icon: Trash2 },
  { id: 'view.toggleGrid', icon: Grid3x3 },
];

export function EditorPalette(props: EditorPaletteProps) {
  const { locale, t } = useI18n();
  const [query, setQuery] = useState('');
  const commands = useMemo(
    () =>
      PALETTE_ACTIONS.map((item) => ({
        ...item,
        label: menuLabel(item.id, locale),
        shortcut: displayAccelerator(commandSpec(item.id).accelerator),
      })),
    [locale],
  );
  const filtered = commands.filter((item) => {
    const haystack = `${item.label} ${item.shortcut}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  useEffect(() => {
    if (!props.open) {
      setQuery('');
    }
  }, [props.open]);

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent
        showCloseButton={false}
        className="top-[15vh] w-full max-w-md translate-y-0 gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t('editorSearchCommands')}</DialogTitle>
          <DialogDescription>{t('editorPalettePlaceholder')}</DialogDescription>
        </DialogHeader>
        <div className="border-b p-2">
          <Input
            autoFocus
            value={query}
            placeholder={t('editorPalettePlaceholder')}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                const first = filtered[0];
                if (first) {
                  props.run(first.id);
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
                    props.run(item.id);
                    props.onClose();
                  }}
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="flex-1">{item.label}</span>
                  <kbd className="text-[10px] text-muted-foreground">{item.shortcut}</kbd>
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
