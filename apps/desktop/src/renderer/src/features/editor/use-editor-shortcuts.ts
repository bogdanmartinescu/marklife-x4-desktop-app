import { useEffect, useRef } from 'react';

interface EditorShortcuts {
  enabled: boolean;
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
  onOpenPalette: () => void;
  onEscape: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
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

export function useEditorShortcuts(handlers: EditorShortcuts): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!handlers.enabled) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      const current = handlersRef.current;
      if (event.key === 'Escape') {
        current.onEscape();
        return;
      }
      if (isTypingTarget(event.target)) {
        return;
      }
      const cmd = event.metaKey || event.ctrlKey;
      if (cmd && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        current.onOpenPalette();
        return;
      }
      if (cmd && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        current.onDuplicate();
        return;
      }
      if (event.key === 'Backspace' || event.key === 'Delete') {
        current.onDeleteSelected();
        return;
      }
      if (cmd) {
        return;
      }
      switch (event.key.toLowerCase()) {
        case 't':
          current.onAddText();
          return;
        case 'q':
          current.onAddQr();
          return;
        case 'b':
          current.onAddBarcode();
          return;
        case 'r':
          current.onAddRect();
          return;
        case 'l':
          current.onAddLine();
          return;
        case 'o':
          current.onAddCircle();
          return;
        case 'a':
          current.onAddArrow();
          return;
        case 's':
          current.onAddIcon();
          return;
        case 'i':
          current.onAddImage();
          return;
        case 'e':
          current.onAddTable();
          return;
        case 'f':
          current.onAddField();
          return;
        case 'g':
          current.onToggleGrid();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers.enabled]);
}
