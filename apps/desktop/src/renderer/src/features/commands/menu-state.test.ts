import { describe, expect, it } from 'vitest';
import { DEFAULT_MENU_STATE } from '@thermalbridge/shared';
import { buildMenuState, menuStateKey } from './menu-state.js';

describe('menuStateKey', () => {
  it('is stable for equal snapshots and changes when a field changes', () => {
    const a = buildMenuState({ screen: 'print', canPrint: true });
    const b = buildMenuState({ screen: 'print', canPrint: true });
    const c = buildMenuState({ screen: 'setup', canPrint: true });
    expect(menuStateKey(a)).toBe(menuStateKey(b));
    expect(menuStateKey(a)).not.toBe(menuStateKey(c));
    expect(a.locale).toBe(DEFAULT_MENU_STATE.locale);
  });
});
