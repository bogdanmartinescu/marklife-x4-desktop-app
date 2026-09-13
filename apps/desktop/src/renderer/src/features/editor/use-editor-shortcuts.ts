import { useEffect, useRef } from 'react';
import type { MenuActionId } from '@thermalbridge/shared';
import { editorShortcutAction, isTypingTarget } from './editor-shortcut-action.js';

interface EditorShortcuts {
  enabled: boolean;
  run: (id: MenuActionId) => void;
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
      if (event.key !== 'Escape' && isTypingTarget(event.target)) {
        return;
      }
      const action = editorShortcutAction(event);
      if (action === null) {
        return;
      }
      if (action !== 'edit.deselect') {
        event.preventDefault();
      }
      current.run(action);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers.enabled]);
}
