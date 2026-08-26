import {
  Barcode,
  Copy,
  Grid3x3,
  ImageIcon,
  Minus,
  QrCode,
  Square,
  Trash2,
  Type,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider.js';
import type { MessageKey } from '@/i18n/messages.js';
import { cn } from '@/lib/utils.js';

interface EditorDockProps {
  selectedId: string | null;
  showGrid: boolean;
  onAddText: () => void;
  onAddQr: () => void;
  onAddBarcode: () => void;
  onAddRect: () => void;
  onAddLine: () => void;
  onAddImage: () => void;
  onDuplicate: () => void;
  onDeleteSelected: () => void;
  onToggleGrid: () => void;
}

const TOOLS: Array<{
  key: MessageKey;
  shortcut: string;
  icon: LucideIcon;
  action: keyof Pick<
    EditorDockProps,
    'onAddText' | 'onAddQr' | 'onAddBarcode' | 'onAddRect' | 'onAddLine' | 'onAddImage'
  >;
}> = [
  { key: 'editorAddText', shortcut: 'T', icon: Type, action: 'onAddText' },
  { key: 'editorAddQr', shortcut: 'Q', icon: QrCode, action: 'onAddQr' },
  { key: 'editorAddBarcode', shortcut: 'B', icon: Barcode, action: 'onAddBarcode' },
  { key: 'editorAddBox', shortcut: 'R', icon: Square, action: 'onAddRect' },
  { key: 'editorAddLine', shortcut: 'L', icon: Minus, action: 'onAddLine' },
  { key: 'editorAddImage', shortcut: 'I', icon: ImageIcon, action: 'onAddImage' },
];

export function EditorDock(props: EditorDockProps) {
  const { t } = useI18n();
  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden items-center pl-3 md:flex">
      <div className="pointer-events-auto relative">
        <div className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-primary/15 blur-2xl" />
        <div className="relative w-[4.75rem] rounded-2xl border border-white/5 bg-ink-800/95 p-1.5 shadow-dock backdrop-blur-md">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <DockBtn
                key={tool.key}
                icon={Icon}
                label={t(tool.key)}
                shortcut={tool.shortcut}
                onClick={props[tool.action]}
              />
            );
          })}
          <div className="mx-2 my-1 h-px bg-white/5" />
          <DockBtn
            icon={Copy}
            label={t('editorDuplicate')}
            shortcut="⌘D"
            disabled={!props.selectedId}
            onClick={props.onDuplicate}
          />
          <DockBtn
            icon={Trash2}
            label={t('editorDelete')}
            shortcut="⌫"
            disabled={!props.selectedId}
            onClick={props.onDeleteSelected}
          />
          <DockBtn
            icon={Grid3x3}
            label={t('editorGrid')}
            shortcut="G"
            active={props.showGrid}
            onClick={props.onToggleGrid}
          />
        </div>
      </div>
    </div>
  );
}

function DockBtn(props: {
  icon: LucideIcon;
  label: string;
  shortcut: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const Icon = props.icon;
  return (
    <button
      type="button"
      disabled={props.disabled === true}
      onClick={props.onClick}
      className={cn(
        'group relative flex w-full flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 hover-fade',
        props.active === true ? 'text-primary' : 'text-ink-300 hover:text-ink-50',
        props.disabled === true && 'opacity-40',
      )}
    >
      {props.active === true ? (
        <>
          <span className="absolute inset-0 rounded-xl bg-primary/10" />
          <span className="absolute inset-x-3 top-0 h-px bg-primary/50" />
          <span className="absolute inset-0 rounded-xl ring-1 ring-primary/25" />
        </>
      ) : (
        <span className="absolute inset-0 rounded-xl bg-ink-700/0 group-hover:bg-ink-700/80" />
      )}
      <Icon className="relative size-5" />
      <span className="relative text-ui-2xs leading-none">{props.label}</span>
      <kbd className="relative mt-0.5 !h-[18px] !min-w-[18px] !px-1 !text-[10px]">{props.shortcut}</kbd>
    </button>
  );
}
