import { useEffect, useRef } from 'react';
import type { MenuState } from '@thermalbridge/shared';
import { menuStateKey } from './menu-state.js';

const SYNC_MS = 50;

export function useMenuSync(state: MenuState): void {
  const lastKey = useRef('');

  useEffect(() => {
    const key = menuStateKey(state);
    if (key === lastKey.current) {
      return;
    }
    if (!window.thermalBridge?.menu) {
      lastKey.current = key;
      return;
    }
    const timer = window.setTimeout(() => {
      lastKey.current = key;
      void window.thermalBridge.menu.setState(state);
    }, SYNC_MS);
    return () => window.clearTimeout(timer);
  }, [state]);
}
