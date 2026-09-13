import { describe, expect, it } from 'vitest';
import {
  MENU_ACTION_IDS,
  MENU_MESSAGE_KEYS,
  MENU_MESSAGES,
  allCommandSpecs,
  assertLocaleMenuParity,
  commandSpec,
  hasModifierAccelerator,
  menuLabel,
} from '../src/commands.js';
import { LOCALES } from '../src/settings.js';

describe('command registry', () => {
  it('has a spec for every MenuActionId', () => {
    expect(allCommandSpecs().map((spec) => spec.id)).toEqual([...MENU_ACTION_IDS]);
  });

  it('has matching EN and RO menu labels', () => {
    assertLocaleMenuParity();
    for (const key of MENU_MESSAGE_KEYS) {
      expect(MENU_MESSAGES.en[key].length).toBeGreaterThan(0);
      expect(MENU_MESSAGES.ro[key].length).toBeGreaterThan(0);
    }
    expect(LOCALES).toEqual(['en', 'ro']);
  });

  it('never registers a modifier-free accelerator natively', () => {
    for (const spec of allCommandSpecs()) {
      if (spec.registerAccelerator) {
        expect(hasModifierAccelerator(spec.accelerator)).toBe(true);
      }
    }
  });

  it('resolves localized labels from the registry', () => {
    expect(menuLabel('file.open', 'en')).toBe('Open…');
    expect(menuLabel('file.open', 'ro')).toBe('Deschide…');
    expect(commandSpec('insert.text').accelerator).toBe('T');
    expect(commandSpec('insert.text').registerAccelerator).toBe(false);
  });
});
