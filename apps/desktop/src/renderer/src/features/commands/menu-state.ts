import { DEFAULT_MENU_STATE, type MenuState } from '@thermalbridge/shared';

export function menuStateKey(state: MenuState): string {
  return JSON.stringify(state);
}

export function buildMenuState(partial: Partial<MenuState>): MenuState {
  return { ...DEFAULT_MENU_STATE, ...partial };
}
