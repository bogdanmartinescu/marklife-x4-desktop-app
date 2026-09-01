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
  Shapes,
  Square,
  Table,
  Trash2,
  TriangleAlert,
  Type,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.js';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import type { MessageKey } from '@/i18n/messages.js';
import { cn } from '@/lib/utils.js';
import { AWB_IMAGE_ID } from './LabelCanvas.js';

interface EditorDockProps {
  orientation?: 'vertical' | 'horizontal';
  selectedId: string | null;
  showGrid: boolean;
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

type ToolAction = keyof Pick<
  EditorDockProps,
  | 'onAddText'
  | 'onAddQr'
  | 'onAddBarcode'
  | 'onAddRect'
  | 'onAddLine'
  | 'onAddCircle'
  | 'onAddArrow'
  | 'onAddIcon'
  | 'onAddImage'
  | 'onAddTable'
  | 'onAddField'
>;

const PRIMARY_TOOLS: Array<{
  key: MessageKey;
  shortcut: string;
  icon: LucideIcon;
  action: ToolAction;
}> = [
  { key: 'editorAddText', shortcut: 'T', icon: Type, action: 'onAddText' },
  { key: 'editorAddQr', shortcut: 'Q', icon: QrCode, action: 'onAddQr' },
  { key: 'editorAddBarcode', shortcut: 'B', icon: Barcode, action: 'onAddBarcode' },
];

const SHAPE_TOOLS: Array<{
  key: MessageKey;
  shortcut: string;
  icon: LucideIcon;
  action: ToolAction;
}> = [
  { key: 'editorAddBox', shortcut: 'R', icon: Square, action: 'onAddRect' },
  { key: 'editorAddLine', shortcut: 'L', icon: Minus, action: 'onAddLine' },
  { key: 'editorAddCircle', shortcut: 'O', icon: Circle, action: 'onAddCircle' },
  { key: 'editorAddArrow', shortcut: 'A', icon: ArrowRight, action: 'onAddArrow' },
];

const MORE_TOOLS: Array<{
  key: MessageKey;
  shortcut: string;
  icon: LucideIcon;
  action: ToolAction;
}> = [
  { key: 'editorAddIcon', shortcut: 'S', icon: TriangleAlert, action: 'onAddIcon' },
  { key: 'editorAddImage', shortcut: 'I', icon: ImageIcon, action: 'onAddImage' },
  { key: 'editorAddTable', shortcut: 'E', icon: Table, action: 'onAddTable' },
  { key: 'editorAddField', shortcut: 'F', icon: CalendarClock, action: 'onAddField' },
];

export function EditorDock(props: EditorDockProps) {
  const { t } = useI18n();
  const vertical = props.orientation !== 'horizontal';
  const tooltipSide = vertical ? 'right' : 'bottom';

  return (
    <div
      className={cn(
        'flex shrink-0 bg-ink-950',
        vertical
          ? 'h-full w-40 flex-col items-stretch justify-start gap-0.5 overflow-hidden border-r border-white/5 p-1.5'
          : 'h-11 w-full flex-row items-center gap-0.5 overflow-x-auto border-b border-white/5 px-1.5',
      )}
    >
      {PRIMARY_TOOLS.map((tool) => (
        <DockBtn
          key={tool.key}
          icon={tool.icon}
          label={t(tool.key)}
          shortcut={tool.shortcut}
          side={tooltipSide}
          labeled={vertical}
          onClick={props[tool.action]}
        />
      ))}
      <ShapesMenu
        side={tooltipSide}
        labeled={vertical}
        label={t('editorAddShapes')}
        items={SHAPE_TOOLS.map((tool) => ({
          key: tool.key,
          label: t(tool.key),
          shortcut: tool.shortcut,
          icon: tool.icon,
          onSelect: props[tool.action],
        }))}
      />
      {MORE_TOOLS.map((tool) => (
        <DockBtn
          key={tool.key}
          icon={tool.icon}
          label={t(tool.key)}
          shortcut={tool.shortcut}
          side={tooltipSide}
          labeled={vertical}
          onClick={props[tool.action]}
        />
      ))}
      <span
        className={cn('bg-white/10', vertical ? 'mx-2 my-0.5 h-px' : 'mx-0.5 h-6 w-px')}
        aria-hidden
      />
      <DockBtn
        icon={Copy}
        label={t('editorDuplicate')}
        shortcut="⌘D"
        side={tooltipSide}
        labeled={vertical}
        disabled={!props.selectedId || props.selectedId === AWB_IMAGE_ID}
        onClick={props.onDuplicate}
      />
      <DockBtn
        icon={Trash2}
        label={t('editorDelete')}
        shortcut="⌫"
        side={tooltipSide}
        labeled={vertical}
        disabled={!props.selectedId}
        onClick={props.onDeleteSelected}
      />
      <DockBtn
        icon={Grid3x3}
        label={t('editorGrid')}
        shortcut="G"
        side={tooltipSide}
        labeled={vertical}
        active={props.showGrid}
        onClick={props.onToggleGrid}
      />
    </div>
  );
}

function DockBtn(props: {
  icon: LucideIcon;
  label: string;
  shortcut: string;
  side: 'right' | 'bottom';
  labeled?: boolean;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const Icon = props.icon;
  const labeled = props.labeled === true;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={props.disabled === true}
          aria-label={props.label}
          aria-pressed={props.active === true ? true : undefined}
          onClick={props.onClick}
          className={cn(
            'flex shrink-0 items-center rounded-lg text-ink-300 hover:bg-ink-800 hover:text-ink-50 hover-fade',
            labeled ? 'h-8 w-full gap-2 px-2' : 'size-9 justify-center',
            props.active === true && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
            props.disabled === true && 'opacity-40',
          )}
        >
          <Icon className="size-4 shrink-0" />
          {labeled ? <span className="min-w-0 truncate text-left text-ui-xs">{props.label}</span> : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side={props.side} sideOffset={6}>
        {props.label} · {props.shortcut}
      </TooltipContent>
    </Tooltip>
  );
}

function ShapesMenu(props: {
  side: 'right' | 'bottom';
  labeled?: boolean;
  label: string;
  items: Array<{
    key: MessageKey;
    label: string;
    shortcut: string;
    icon: LucideIcon;
    onSelect: () => void;
  }>;
}) {
  const labeled = props.labeled === true;
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={props.label}
              className={cn(
                'flex shrink-0 items-center rounded-lg text-ink-300 hover:bg-ink-800 hover:text-ink-50 hover-fade',
                labeled ? 'h-8 w-full gap-2 px-2' : 'size-9 justify-center',
              )}
            >
              <Shapes className="size-4 shrink-0" />
              {labeled ? (
                <span className="min-w-0 truncate text-left text-ui-xs">{props.label}</span>
              ) : null}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side={props.side} sideOffset={6}>
          {props.label}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        side={props.side}
        align="start"
        sideOffset={8}
        className="min-w-44 border-white/10 bg-ink-800"
      >
        {props.items.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.key} onSelect={item.onSelect}>
              <Icon />
              {item.label}
              <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
