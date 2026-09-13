import { describe, expect, it } from 'vitest';
import { MenuActionIdSchema } from '../src/commands.js';
import { DEFAULT_MENU_STATE, MenuCommandSchema, MenuStateSchema } from '../src/menu-schemas.js';

describe('MenuStateSchema', () => {
  it('accepts the default menu state', () => {
    expect(MenuStateSchema.parse(DEFAULT_MENU_STATE)).toEqual(DEFAULT_MENU_STATE);
  });

  it('rejects an unknown screen', () => {
    expect(MenuStateSchema.safeParse({ ...DEFAULT_MENU_STATE, screen: 'nope' }).success).toBe(false);
  });
});

describe('MenuCommandSchema', () => {
  it('accepts a known action and optional payload', () => {
    expect(MenuCommandSchema.parse({ action: 'file.open' })).toEqual({ action: 'file.open' });
    expect(MenuCommandSchema.parse({ action: 'view.screen', payload: 'setup' })).toEqual({
      action: 'view.screen',
      payload: 'setup',
    });
  });

  it('rejects an unknown action id', () => {
    expect(MenuCommandSchema.safeParse({ action: 'file.hack' }).success).toBe(false);
    expect(MenuActionIdSchema.safeParse('file.hack').success).toBe(false);
  });
});
