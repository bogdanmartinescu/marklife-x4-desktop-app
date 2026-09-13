import { describe, expect, it } from 'vitest';
import { displayAccelerator } from './accelerator-display.js';

describe('displayAccelerator', () => {
  it('maps native accelerators to compact hints', () => {
    expect(displayAccelerator('CmdOrCtrl+D')).toBe('⌘D');
    expect(displayAccelerator('Backspace')).toBe('⌫');
    expect(displayAccelerator('Delete')).toBe('Del');
    expect(displayAccelerator('Escape')).toBe('Esc');
    expect(displayAccelerator('T')).toBe('T');
  });
});
