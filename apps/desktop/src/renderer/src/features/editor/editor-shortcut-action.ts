import type { MenuActionId } from '@thermalbridge/shared';

const SINGLE_KEYS: Record<string, MenuActionId> = {
  t: 'insert.text',
  q: 'insert.qr',
  b: 'insert.barcode',
  r: 'insert.box',
  l: 'insert.line',
  o: 'insert.circle',
  a: 'insert.arrow',
  s: 'insert.icon',
  i: 'insert.image',
  e: 'insert.table',
  f: 'insert.field',
  g: 'view.toggleGrid',
};

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}

export function editorShortcutAction(event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
}): MenuActionId | null {
  if (event.key === 'Escape') {
    return 'edit.deselect';
  }
  if (event.metaKey || event.ctrlKey) {
    return null;
  }
  if (event.key === 'Backspace' || event.key === 'Delete') {
    return 'edit.delete';
  }
  return SINGLE_KEYS[event.key.toLowerCase()] ?? null;
}
