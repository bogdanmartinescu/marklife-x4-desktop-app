import { describe, expect, it, vi } from 'vitest';
import { APP_DISPLAY_NAME, applyAppDisplayName } from './app-name.js';

describe('applyAppDisplayName', () => {
  it('overrides the Electron process name used for the macOS app menu', () => {
    const setName = vi.fn();
    applyAppDisplayName({ setName });
    expect(APP_DISPLAY_NAME).toBe('ThermalBridge');
    expect(setName).toHaveBeenCalledWith('ThermalBridge');
  });
});
