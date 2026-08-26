import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  ArrowDown,
  ArrowUp,
  Barcode,
  ImageIcon,
  Minus,
  QrCode,
  Square,
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
import type { OverlayElement, OverlayKind } from './overlay.js';
import { AWB_IMAGE_ID } from './LabelCanvas.js';

interface EditorInspectorProps {
  overlay: OverlayElement | null;
  selectedId: string | null;
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
      {overlay.kind === 'text' ? (
        <>
          <Field label={t('editorText')}>
            <Input value={overlay.text} onChange={(event) => patch({ text: event.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('editorFontSize')}>
              <Input
                type="number"
                min={2}
                max={40}
                value={overlay.fontSizeMm}
                onChange={(event) => patch({ fontSizeMm: Number(event.target.value) })}
              />
            </Field>
            <Field label={t('editorAlign')}>
              <Select
                value={overlay.align}
                onValueChange={(value) => patch({ align: value as OverlayElement['align'] })}
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
            />
          </Field>
          <Field label={t('editorBarcodeFormat')}>
            <Select
              value={overlay.barcodeFormat}
              onValueChange={(value) =>
                patch({ barcodeFormat: value as OverlayElement['barcodeFormat'] })
              }
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
      {overlay.kind === 'rect' ? (
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
      {overlay.kind === 'line' || overlay.kind === 'rect' ? (
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

function kindLabel(kind: OverlayKind): 'editorAddText' | 'editorAddQr' | 'editorAddBarcode' | 'editorAddBox' | 'editorAddLine' | 'editorAddImage' {
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
  }
}
