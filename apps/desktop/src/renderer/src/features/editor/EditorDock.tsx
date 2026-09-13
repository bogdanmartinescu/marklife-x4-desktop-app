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

export function EditorDock(props: EditorDockProps) {
  const { locale, t } = useI18n();
  const vertical = props.orientation !== 'horizontal';
  const tooltipSide = vertical ? 'right' : 'bottom';

  return (
    <div
      className={cn(
        'flex rounded-xl border border-white/10 bg-ink-950/95 shadow-panel backdrop-blur-sm',
        vertical
          ? 'h-full max-h-full w-[5.5rem] flex-col items-stretch justify-start gap-1 overflow-y-auto p-1.5'
          : 'h-[4.25rem] w-full flex-row items-center gap-1 overflow-x-auto px-1.5',
      )}
    >
      {PRIMARY_TOOLS.map((tool) => (
        <DockBtn
          key={tool.id}
          icon={tool.icon}
          label={menuLabel(tool.id, locale)}
          shortcut={displayAccelerator(commandSpec(tool.id).accelerator)}
          side={tooltipSide}
          labeled
          onClick={() => props.run(tool.id)}
        />
      ))}
      <ShapesMenu
        side={tooltipSide}
        labeled
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
          labeled
          onClick={() => props.run(tool.id)}
        />
      ))}
      <span
        className={cn('bg-white/10', vertical ? 'mx-2 my-0.5 h-px' : 'mx-0.5 h-6 w-px')}
        aria-hidden
      />
      <DockBtn
        icon={Copy}
        label={menuLabel('edit.duplicate', locale)}
        shortcut={displayAccelerator(commandSpec('edit.duplicate').accelerator)}
        side={tooltipSide}
        labeled
        disabled={!props.selectedId || props.selectedId === AWB_IMAGE_ID}
        onClick={() => props.run('edit.duplicate')}
      />
      <DockBtn
        icon={Trash2}
        label={menuLabel('edit.delete', locale)}
        shortcut={displayAccelerator(commandSpec('edit.delete').accelerator)}
        side={tooltipSide}
        labeled
        disabled={!props.selectedId}
        onClick={() => props.run('edit.delete')}
      />
      <DockBtn
        icon={Grid3x3}
        label={menuLabel('view.toggleGrid', locale)}
        shortcut={displayAccelerator(commandSpec('view.toggleGrid').accelerator)}
        side={tooltipSide}
        labeled
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
            'flex shrink-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-ink-300 hover:bg-ink-800 hover:text-ink-50 hover-fade',
            labeled ? 'w-full min-h-[3.75rem]' : 'size-12',
            props.active === true && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
            props.disabled === true && 'opacity-40',
          )}
        >
          <Icon className="size-6 shrink-0" />
          {labeled ? (
            <span className="w-full text-center text-[10px] leading-tight text-balance line-clamp-2">
              {props.label}
            </span>
          ) : null}
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
    id: MenuActionId;
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
                'flex shrink-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-ink-300 hover:bg-ink-800 hover:text-ink-50 hover-fade',
                labeled ? 'w-full min-h-[3.75rem]' : 'size-12',
              )}
            >
              <Shapes className="size-6 shrink-0" />
              {labeled ? (
                <span className="w-full text-center text-[10px] leading-tight text-balance line-clamp-2">
                  {props.label}
                </span>
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
            <DropdownMenuItem key={item.id} onSelect={item.onSelect}>
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
