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
import { Button } from '@/components/ui/button.js';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import type { MessageKey } from '@/i18n/messages.js';
import { AWB_IMAGE_ID } from './LabelCanvas.js';

interface EditorToolbarProps {
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

const TOOLS: Array<{
  key: MessageKey;
  shortcut: string;
  icon: typeof Type;
  action: keyof Pick<
    EditorToolbarProps,
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
}> = [
  { key: 'editorAddText', shortcut: 'T', icon: Type, action: 'onAddText' },
  { key: 'editorAddQr', shortcut: 'Q', icon: QrCode, action: 'onAddQr' },
  { key: 'editorAddBarcode', shortcut: 'B', icon: Barcode, action: 'onAddBarcode' },
  { key: 'editorAddBox', shortcut: 'R', icon: Square, action: 'onAddRect' },
  { key: 'editorAddLine', shortcut: 'L', icon: Minus, action: 'onAddLine' },
  { key: 'editorAddCircle', shortcut: 'O', icon: Circle, action: 'onAddCircle' },
  { key: 'editorAddArrow', shortcut: 'A', icon: ArrowRight, action: 'onAddArrow' },
  { key: 'editorAddIcon', shortcut: 'S', icon: TriangleAlert, action: 'onAddIcon' },
  { key: 'editorAddImage', shortcut: 'I', icon: ImageIcon, action: 'onAddImage' },
  { key: 'editorAddTable', shortcut: 'E', icon: Table, action: 'onAddTable' },
  { key: 'editorAddField', shortcut: 'F', icon: CalendarClock, action: 'onAddField' },
];

export function EditorToolbar(props: EditorToolbarProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        return (
          <Tooltip key={tool.key}>
            <TooltipTrigger asChild>
              <Button type="button" size="xs" variant="outline" onClick={props[tool.action]}>
                <Icon />
                {t(tool.key)}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t(tool.key)} · {tool.shortcut}
            </TooltipContent>
          </Tooltip>
        );
      })}
      <Button
        type="button"
        size="xs"
        variant="outline"
        disabled={!props.selectedId || props.selectedId === AWB_IMAGE_ID}
        onClick={props.onDuplicate}
      >
        <Copy />
        {t('editorDuplicate')}
      </Button>
      <Button
        type="button"
        size="xs"
        variant="outline"
        disabled={!props.selectedId}
        onClick={props.onDeleteSelected}
      >
        <Trash2 />
        {t('editorDelete')}
      </Button>
      <Button
        type="button"
        size="xs"
        variant={props.showGrid ? 'default' : 'outline'}
        onClick={props.onToggleGrid}
      >
        <Grid3x3 />
        {t('editorGrid')}
      </Button>
    </div>
  );
}
