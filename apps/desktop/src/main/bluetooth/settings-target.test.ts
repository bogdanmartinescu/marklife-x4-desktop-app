import { describe, expect, it } from 'vitest';
import { bluetoothSettingsTarget } from './settings-target.js';

describe('bluetoothSettingsTarget', () => {
  it('opens macOS System Settings Bluetooth pane', () => {
    const target = bluetoothSettingsTarget('darwin');
    expect(target).toEqual({
      kind: 'url',
      url: 'x-apple.systempreferences:com.apple.settings.Bluetooth',
    });
  });

  it('opens Windows Bluetooth settings', () => {
    const target = bluetoothSettingsTarget('win32');
    expect(target).toEqual({
      kind: 'url',
      url: 'ms-settings:bluetooth',
    });
  });

  it('uses a fixed Linux Bluetooth settings command with no renderer input', () => {
    const target = bluetoothSettingsTarget('linux');
    expect(target.kind).toBe('spawn');
    if (target.kind !== 'spawn') {
      return;
    }
    expect(target.command).toBe('gnome-control-center');
    expect(target.args).toEqual(['bluetooth']);
  });
});
