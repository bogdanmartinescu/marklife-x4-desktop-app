import { describe, expect, it } from 'vitest';
import { MENU_ACTION_IDS } from '@thermalbridge/shared';
import { createCommandHandlers } from './command-handlers.js';

describe('useCommands handler map', () => {
  it('has a handler for every registry action', () => {
    const handlers = createCommandHandlers({
      actions: () => {
        throw new Error('unused');
      },
      preview: () => null,
    });
    for (const id of MENU_ACTION_IDS) {
      expect(typeof handlers[id]).toBe('function');
    }
  });
});
