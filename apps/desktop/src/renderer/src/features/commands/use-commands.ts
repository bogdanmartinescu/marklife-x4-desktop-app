import { useCallback, useEffect, useRef } from 'react';
import { MenuCommandSchema, type MenuActionId } from '@thermalbridge/shared';
import type { CommandHandlers } from './command-handlers.js';

export function useCommands(handlers: CommandHandlers): {
  run: (id: MenuActionId, payload?: unknown) => void;
} {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const run = useCallback((id: MenuActionId, payload?: unknown): void => {
    handlersRef.current[id](payload);
  }, []);

  useEffect(() => {
    if (!window.thermalBridge?.menu) {
      return;
    }
    return window.thermalBridge.menu.onCommand((command) => {
      const parsed = MenuCommandSchema.safeParse(command);
      if (!parsed.success) {
        return;
      }
      run(parsed.data.action, parsed.data.payload);
    });
  }, [run]);

  return { run };
}
