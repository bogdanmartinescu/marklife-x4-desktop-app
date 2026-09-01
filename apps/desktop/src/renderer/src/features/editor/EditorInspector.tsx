import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Barcode,
  Bold,
  CalendarClock,
  Circle,
  ImageIcon,
  Italic,
  Minus,
  QrCode,
  Square,
  Table,
  TriangleAlert,
  Type,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.js';
import { Switch } from '@/components/ui/switch.js';
import { Field } from '@/components/field.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import type { MessageKey } from '@/i18n/messages.js';
import { cn } from '@/lib/utils.js';
import { normalizeBarcodeValue } from './barcode-value.js';
import { toggleFontStyle } from './font-style.js';
import { PRINT_ICONS } from './icon-catalog.js';
import { AWB_IMAGE_ID } from './LabelCanvas.js';
import {
  FONT_FAMILIES,
  placeOverlay,
  type DateFormat,
  type FieldKind,
  type OverlayElement,
  type OverlayKind,
} from './overlay.js';
import { parseTableCells, resizeTableCells, serializeTableCells } from './table-cells.js';

interface EditorInspectorProps {
  overlay: OverlayElement | null;
  selectedId: string | null;
  labelWidthMm: number;
  labelHeightMm: number;
  onChange: (id: string, patch: Partial<OverlayElement>) => void;
  onCenter: () => void;
  onCenterH: () => void;
  onCenterV: () => void;
  onZOrder: (direction: 'up' | 'down') => void;
}

const KIND_ICONS: Record<OverlayKind, LucideIcon> = {
  text: Type,
  qr: QrCode,
  barcode: Barcode,
  rect: Square,
  line: Minus,
  image: ImageIcon,
  circle: Circle,
  arrow: ArrowRight,
  icon: TriangleAlert,
  table: Table,
  field: CalendarClock,
};

export function EditorInspector(props: EditorInspectorProps) {
  const { t } = useI18n();
  if (!props.selectedId || props.selectedId === AWB_IMAGE_ID) {
    return null;
  }
  if (!props.overlay) {
    return null;
  }
  const overlay = props.overlay;
  const Icon = KIND_ICONS[overlay.kind];
  const patch = (next: Partial<OverlayElement>): void => {
    props.onChange(overlay.id, next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4" />
          {t(kindLabel(overlay.kind))}
        </div>
        <div className="flex gap-1">
          <Button type="button" size="icon-xs" variant="ghost" onClick={() => props.onZOrder('up')}>
            <ArrowUp />
          </Button>
          <Button type="button" size="icon-xs" variant="ghost" onClick={() => props.onZOrder('down')}>
            <ArrowDown />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t('editorPosX')}>
          <Input
            type="number"
            min={0}
            step={0.1}
            value={roundMm(overlay.xMm)}
            onChange={(event) =>
              patch(placeOverlay(overlay, { xMm: Number(event.target.value) }, props.labelWidthMm, props.labelHeightMm))
            }
          />
        </Field>
        <Field label={t('editorPosY')}>
          <Input
            type="number"
            min={0}
            step={0.1}
            value={roundMm(overlay.yMm)}
            onChange={(event) =>
              patch(placeOverlay(overlay, { yMm: Number(event.target.value) }, props.labelWidthMm, props.labelHeightMm))
            }
          />
        </Field>
        <Field label={t('editorWidth')}>
          <Input
            type="number"
            min={1}
            step={0.1}
            value={roundMm(overlay.widthMm)}
            onChange={(event) =>
              patch(
                placeOverlay(overlay, { widthMm: Number(event.target.value) }, props.labelWidthMm, props.labelHeightMm),
              )
            }
          />
        </Field>
        <Field label={t('editorHeight')}>
          <Input
            type="number"
            min={1}
            step={0.1}
            value={roundMm(overlay.heightMm)}
            onChange={(event) =>
              patch(
                placeOverlay(overlay, { heightMm: Number(event.target.value) }, props.labelWidthMm, props.labelHeightMm),
              )
            }
          />
        </Field>
      </div>
      {overlay.kind === 'text' || overlay.kind === 'field' ? (
        <>
          <Field label={overlay.kind === 'field' ? t('editorPrefix') : t('editorText')}>
            <Input value={overlay.text} onChange={(event) => patch({ text: event.target.value })} />
          </Field>
          <FontControls overlay={overlay} onChange={patch} />
        </>
      ) : null}
      {overlay.kind === 'field' ? (
        <>
          <Field label={t('editorFieldKind')}>
            <Select
              value={overlay.fieldKind}
              onValueChange={(value) => patch({ fieldKind: value as FieldKind })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">{t('editorFieldDate')}</SelectItem>
                <SelectItem value="serial">{t('editorFieldSerial')}</SelectItem>
                <SelectItem value="counter">{t('editorFieldCounter')}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {overlay.fieldKind === 'date' ? (
            <Field label={t('editorDateFormat')}>
              <Select
                value={overlay.dateFormat}
                onValueChange={(value) => patch({ dateFormat: value as DateFormat })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iso">2026-08-28</SelectItem>
                  <SelectItem value="eu">28.08.2026</SelectItem>
                  <SelectItem value="us">08/28/2026</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <Field label={t('editorSerialStart')}>
                <Input
                  type="number"
                  min={0}
                  value={overlay.serialStart}
                  onChange={(event) => patch({ serialStart: Number(event.target.value) })}
                />
              </Field>
              <Field label={t('editorSerialStep')}>
                <Input
                  type="number"
                  min={1}
                  value={overlay.serialStep}
                  onChange={(event) => patch({ serialStep: Number(event.target.value) })}
                />
              </Field>
              {overlay.fieldKind === 'serial' ? (
                <Field label={t('editorSerialPad')}>
                  <Input
                    type="number"
                    min={0}
                    max={12}
                    value={overlay.serialPad}
                    onChange={(event) => patch({ serialPad: Number(event.target.value) })}
                  />
                </Field>
              ) : (
                <span />
              )}
            </div>
          )}
        </>
      ) : null}
      {overlay.kind === 'qr' ? (
        <>
          <Field label={t('editorContent')}>
            <Input
              value={overlay.content}
              onChange={(event) => patch({ content: event.target.value })}
            />
          </Field>
          <Field label={t('editorQrEcl')}>
            <Select
              value={overlay.qrEcl}
              onValueChange={(value) => patch({ qrEcl: value as OverlayElement['qrEcl'] })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="L">L</SelectItem>
                <SelectItem value="M">M</SelectItem>
                <SelectItem value="Q">Q</SelectItem>
                <SelectItem value="H">H</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      ) : null}
      {overlay.kind === 'barcode' ? (
        <>
          <Field label={t('editorContent')}>
            <Input
              value={overlay.content}
              onChange={(event) => patch({ content: event.target.value })}
              onBlur={() =>
                patch({ content: normalizeBarcodeValue(overlay.barcodeFormat, overlay.content) })
              }
            />
          </Field>
          {overlay.barcodeFormat === 'EAN13' ? (
            <p className="text-ui-2xs text-muted-foreground">{t('editorBarcodeEan13Hint')}</p>
          ) : null}
          {overlay.barcodeFormat === 'UPC' ? (
            <p className="text-ui-2xs text-muted-foreground">{t('editorBarcodeUpcHint')}</p>
          ) : null}
          {overlay.barcodeFormat === 'CODE39' ? (
            <p className="text-ui-2xs text-muted-foreground">{t('editorBarcodeCode39Hint')}</p>
          ) : null}
          <Field label={t('editorBarcodeFormat')}>
            <Select
              value={overlay.barcodeFormat}
              onValueChange={(value) => {
                const barcodeFormat = value as OverlayElement['barcodeFormat'];
                patch({
                  barcodeFormat,
                  content: normalizeBarcodeValue(barcodeFormat, overlay.content),
                });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CODE128">CODE128</SelectItem>
                <SelectItem value="CODE39">CODE39</SelectItem>
                <SelectItem value="EAN13">EAN13</SelectItem>
                <SelectItem value="UPC">UPC</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={overlay.barcodeDisplayValue}
              onCheckedChange={(checked) => patch({ barcodeDisplayValue: checked })}
            />
            {t('editorBarcodeValue')}
          </label>
        </>
      ) : null}
      {overlay.kind === 'icon' ? (
        <div className="grid grid-cols-5 gap-1">
          {PRINT_ICONS.map((icon) => (
            <button
              key={icon.id}
              type="button"
              title={t(icon.labelKey)}
              onClick={() => patch({ iconId: icon.id })}
              className={cn(
                'flex aspect-square items-center justify-center rounded-md border p-1 hover:bg-ink-750',
                overlay.iconId === icon.id ? 'border-primary bg-primary/10' : 'border-white/10',
              )}
            >
              <svg viewBox={`0 0 ${String(icon.viewBox)} ${String(icon.viewBox)}`} className="size-6">
                {icon.fill.map((d) => (
                  <path key={d} d={d} fill="currentColor" />
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
            </button>
          ))}
        </div>
      ) : null}
      {overlay.kind === 'table' ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('editorTableRows')}>
              <Input
                type="number"
                min={1}
                max={12}
                value={overlay.tableRows}
                onChange={(event) => {
                  const tableRows = Math.max(1, Number(event.target.value));
                  patch({
                    tableRows,
                    text: serializeTableCells(
                      resizeTableCells(
                        parseTableCells(overlay.text, overlay.tableRows, overlay.tableCols),
                        tableRows,
                        overlay.tableCols,
                      ),
                    ),
                  });
                }}
              />
            </Field>
            <Field label={t('editorTableCols')}>
              <Input
                type="number"
                min={1}
                max={8}
                value={overlay.tableCols}
                onChange={(event) => {
                  const tableCols = Math.max(1, Number(event.target.value));
                  patch({
                    tableCols,
                    text: serializeTableCells(
                      resizeTableCells(
                        parseTableCells(overlay.text, overlay.tableRows, overlay.tableCols),
                        overlay.tableRows,
                        tableCols,
                      ),
                    ),
                  });
                }}
              />
            </Field>
          </div>
          <Field label={t('editorTableCells')}>
            <textarea
              value={overlay.text}
              rows={Math.max(2, overlay.tableRows)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-1 font-mono text-sm"
              onChange={(event) => patch({ text: event.target.value })}
            />
          </Field>
          <FontControls overlay={overlay} onChange={patch} />
        </>
      ) : null}
      {overlay.kind === 'rect' || overlay.kind === 'circle' || overlay.kind === 'text' || overlay.kind === 'field' ? (
        <Field label={t('editorFill')}>
          <Select
            value={overlay.fill}
            onValueChange={(value) => patch({ fill: value as OverlayElement['fill'] })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="black">{t('editorFillBlack')}</SelectItem>
              <SelectItem value="white">{t('editorFillWhite')}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      {overlay.kind === 'line' ||
      overlay.kind === 'rect' ||
      overlay.kind === 'circle' ||
      overlay.kind === 'arrow' ||
      overlay.kind === 'table' ? (
        <Field label={t('editorStroke')}>
          <Input
            type="number"
            min={0.1}
            step={0.1}
            value={overlay.strokeMm}
            onChange={(event) => patch({ strokeMm: Number(event.target.value) })}
          />
        </Field>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        <Button type="button" size="xs" variant="outline" onClick={props.onCenter}>
          {t('editorCenter')}
        </Button>
        <Button type="button" size="icon-xs" variant="outline" onClick={props.onCenterH}>
          <AlignHorizontalJustifyCenter />
        </Button>
        <Button type="button" size="icon-xs" variant="outline" onClick={props.onCenterV}>
          <AlignVerticalJustifyCenter />
        </Button>
      </div>
    </div>
  );
}

function FontControls(props: {
  overlay: OverlayElement;
  onChange: (patch: Partial<OverlayElement>) => void;
}) {
  const { t } = useI18n();
  const familyId =
    FONT_FAMILIES.find((item) => item.css === props.overlay.fontFamily)?.id ?? 'sans';
  return (
    <>
      <Field label={t('editorFont')}>
        <Select
          value={familyId}
          onValueChange={(value) => {
            const family = FONT_FAMILIES.find((item) => item.id === value);
            if (family) {
              props.onChange({ fontFamily: family.css });
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((family) => (
              <SelectItem key={family.id} value={family.id}>
                {family.id === 'sans'
                  ? t('editorFontSans')
                  : family.id === 'serif'
                    ? t('editorFontSerif')
                    : t('editorFontMono')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t('editorFontSize')}>
          <Input
            type="number"
            min={2}
            max={40}
            value={props.overlay.fontSizeMm}
            onChange={(event) => props.onChange({ fontSizeMm: Number(event.target.value) })}
          />
        </Field>
        <Field label={t('editorAlign')}>
          <Select
            value={props.overlay.align}
            onValueChange={(value) =>
              props.onChange({ align: value as OverlayElement['align'] })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">{t('editorAlignLeft')}</SelectItem>
              <SelectItem value="center">{t('editorAlignCenter')}</SelectItem>
              <SelectItem value="right">{t('editorAlignRight')}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="flex gap-1">
        <Button
          type="button"
          size="icon-xs"
          variant={props.overlay.fontStyle.includes('bold') ? 'default' : 'outline'}
          aria-label={t('editorBold')}
          onClick={() => props.onChange({ fontStyle: toggleFontStyle(props.overlay.fontStyle, 'bold') })}
        >
          <Bold />
        </Button>
        <Button
          type="button"
          size="icon-xs"
          variant={props.overlay.fontStyle.includes('italic') ? 'default' : 'outline'}
          aria-label={t('editorItalic')}
          onClick={() =>
            props.onChange({ fontStyle: toggleFontStyle(props.overlay.fontStyle, 'italic') })
          }
        >
          <Italic />
        </Button>
      </div>
    </>
  );
}

function roundMm(value: number): number {
  return Math.round(value * 10) / 10;
}

function kindLabel(kind: OverlayKind): MessageKey {
  switch (kind) {
    case 'text':
      return 'editorAddText';
    case 'qr':
      return 'editorAddQr';
    case 'barcode':
      return 'editorAddBarcode';
    case 'rect':
      return 'editorAddBox';
    case 'line':
      return 'editorAddLine';
    case 'image':
      return 'editorAddImage';
    case 'circle':
      return 'editorAddCircle';
    case 'arrow':
      return 'editorAddArrow';
    case 'icon':
      return 'editorAddIcon';
    case 'table':
      return 'editorAddTable';
    case 'field':
      return 'editorAddField';
  }
}
