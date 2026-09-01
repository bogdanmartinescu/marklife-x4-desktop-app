import type { DateFormat, OverlayElement } from './overlay.js';

export type { DateFormat, FieldKind } from './overlay.js';

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatFieldDate(date: Date, format: DateFormat): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  if (format === 'eu') {
    return `${day}.${month}.${year}`;
  }
  if (format === 'us') {
    return `${month}/${day}/${year}`;
  }
  return `${year}-${month}-${day}`;
}

export function formatSerial(start: number, step: number, pad: number, copyIndex: number): string {
  const value = Math.max(0, Math.round(start + copyIndex * step));
  if (pad <= 0) {
    return String(value);
  }
  return String(value).padStart(pad, '0');
}

export function resolveFieldText(
  overlay: Pick<OverlayElement, 'fieldKind' | 'dateFormat' | 'serialStart' | 'serialStep' | 'serialPad' | 'text'>,
  options: { now: Date; copyIndex: number },
): string {
  const prefix = overlay.text;
  if (overlay.fieldKind === 'date') {
    return `${prefix}${formatFieldDate(options.now, overlay.dateFormat)}`;
  }
  const pad = overlay.fieldKind === 'counter' ? 0 : overlay.serialPad;
  return `${prefix}${formatSerial(overlay.serialStart, overlay.serialStep, pad, options.copyIndex)}`;
}

export function hasIncrementingFields(overlays: ReadonlyArray<Pick<OverlayElement, 'kind' | 'fieldKind'>>): boolean {
  return overlays.some((overlay) => overlay.kind === 'field' && overlay.fieldKind !== 'date');
}
