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
import { commandSpec, menuLabel, type MenuActionId } from '@thermalbridge/shared';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.js';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.js';
import { displayAccelerator } from '@/features/commands/accelerator-display.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import { cn } from '@/lib/utils.js';
import { AWB_IMAGE_ID } from './LabelCanvas.js';

interface EditorDockProps {
  orientation?: 'vertical' | 'horizontal';
  selectedId: string | null;
  showGrid: boolean;
  run: (id: MenuActionId) => void;
}

const PRIMARY_TOOLS: Array<{ id: MenuActionId; icon: LucideIcon }> = [
  { id: 'insert.text', icon: Type },
  { id: 'insert.qr', icon: QrCode },
  { id: 'insert.barcode', icon: Barcode },
];

const SHAPE_TOOLS: Array<{ id: MenuActionId; icon: LucideIcon }> = [
  { id: 'insert.box', icon: Square },
  { id: 'insert.line', icon: Minus },
  { id: 'insert.circle', icon: Circle },
  { id: 'insert.arrow', icon: ArrowRight },
];

const MORE_TOOLS: Array<{ id: MenuActionId; icon: LucideIcon }> = [
  { id: 'insert.icon', icon: TriangleAlert },
  { id: 'insert.image', icon: ImageIcon },
  { id: 'insert.table', icon: Table },
  { id: 'insert.field', icon: CalendarClock },
];

function dockTileClass(options: {
  vertical: boolean;
  active?: boolean;
  disabled?: boolean;
}): string {
  return cn(
    'group relative flex shrink-0 items-center justify-center rounded-lg transition-all duration-150',
    'hover:bg-ink-800 hover:text-ink-50 hover:shadow-sm hover:scale-105',
    'active:scale-95',
    options.vertical ? 'w-full aspect-square p-2' : 'min-h-[4.75rem] w-[4.75rem] flex-col gap-1 px-2 py-2.5',
    options.active === true && 'bg-primary/10 text-primary ring-1 ring-primary/30 hover:bg-primary/15 hover:text-primary',
    options.disabled === true && 'opacity-40 cursor-not-allowed hover:scale-100',
    !options.disabled && 'cursor-grab active:cursor-grabbing text-ink-200',
  );
}

export function EditorDock(props: EditorDockProps) {
  const { locale, t } = useI18n();
  const vertical = props.orientation !== 'horizontal';
  const tooltipSide = vertical ? 'right' : 'bottom';

  return (
    <div
      className={cn(
        'flex rounded-2xl border border-white/10 bg-ink-950/95 shadow-panel backdrop-blur-sm select-none',
        vertical
          ? 'h-auto max-h-full w-16 flex-col items-stretch gap-1 overflow-y-auto p-1.5'
          : 'h-[6rem] w-full flex-row items-center gap-0.5 overflow-x-auto px-2 py-1.5',
      )}
    >
      {PRIMARY_TOOLS.map((tool) => (
        <DockBtn
          key={tool.id}
          icon={tool.icon}
          label={menuLabel(tool.id, locale)}
          shortcut={displayAccelerator(commandSpec(tool.id).accelerator)}
          side={tooltipSide}
          vertical={vertical}
          onClick={() => props.run(tool.id)}
        />
      ))}
      <ShapesMenu
        side={tooltipSide}
        vertical={vertical}
        label={t('editorAddShapes')}
        items={SHAPE_TOOLS.map((tool) => ({
          id: tool.id,
          label: menuLabel(tool.id, locale),
          shortcut: displayAccelerator(commandSpec(tool.id).accelerator),
          icon: tool.icon,
          onSelect: () => props.run(tool.id),
        }))}
      />
      {MORE_TOOLS.map((tool) => (
        <DockBtn
          key={tool.id}
          icon={tool.icon}
          label={menuLabel(tool.id, locale)}
          shortcut={displayAccelerator(commandSpec(tool.id).accelerator)}
          side={tooltipSide}
          vertical={vertical}
          onClick={() => props.run(tool.id)}
        />
      ))}
      {vertical && <div className="mx-1.5 my-0.5 h-px bg-white/10" aria-hidden />}
      {!vertical && <span className="mx-1 h-10 w-px bg-white/10" aria-hidden />}
      <DockBtn
        icon={Copy}
        label={menuLabel('edit.duplicate', locale)}
        shortcut={displayAccelerator(commandSpec('edit.duplicate').accelerator)}
        side={tooltipSide}
        vertical={vertical}
        disabled={!props.selectedId || props.selectedId === AWB_IMAGE_ID}
        onClick={() => props.run('edit.duplicate')}
      />
      <DockBtn
        icon={Trash2}
        label={menuLabel('edit.delete', locale)}
        shortcut={displayAccelerator(commandSpec('edit.delete').accelerator)}
        side={tooltipSide}
        vertical={vertical}
        disabled={!props.selectedId}
        onClick={() => props.run('edit.delete')}
      />
      <DockBtn
        icon={Grid3x3}
        label={menuLabel('view.toggleGrid', locale)}
        shortcut={displayAccelerator(commandSpec('view.toggleGrid').accelerator)}
        side={tooltipSide}
        vertical={vertical}
        active={props.showGrid}
        onClick={() => props.run('view.toggleGrid')}
      />
    </div>
  );
}

function DockBtn(props: {
  icon: LucideIcon;
  label: string;
  shortcut: string;
  side: 'right' | 'bottom';
  vertical: boolean;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const Icon = props.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={props.disabled === true}
          aria-label={props.label}
          aria-pressed={props.active === true ? true : undefined}
          onClick={props.onClick}
          draggable={props.disabled !== true}
          onDragStart={(e) => {
            if (props.disabled) {
              e.preventDefault();
              return;
            }
            e.dataTransfer.effectAllowed = 'move';
          }}
          className={dockTileClass({
            vertical: props.vertical,
            ...(props.active !== undefined ? { active: props.active } : {}),
            ...(props.disabled !== undefined ? { disabled: props.disabled } : {}),
          })}
        >
          <Icon className="size-6 shrink-0 transition-transform group-hover:scale-110" strokeWidth={1.75} />
        </button>
      </TooltipTrigger>
      <TooltipContent side={props.side} sideOffset={8}>
        {props.label} · {props.shortcut}
      </TooltipContent>
    </Tooltip>
  );
}

function ShapesMenu(props: {
  side: 'right' | 'bottom';
  vertical: boolean;
  label: string;
  items: Array<{
    id: MenuActionId;
    label: string;
    shortcut: string;
    icon: LucideIcon;
    onSelect: () => void;
  }>;
}) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={props.label}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
              }}
              className={dockTileClass({ vertical: props.vertical })}
            >
              <Shapes className="size-6 shrink-0 transition-transform group-hover:scale-110" strokeWidth={1.75} />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side={props.side} sideOffset={8}>
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
            <DropdownMenuItem key={item.id} onSelect={item.onSelect}>
              <Icon className="size-4" strokeWidth={1.75} />
              {item.label}
              <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
