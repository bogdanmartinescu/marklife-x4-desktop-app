export type BluetoothSettingsTarget =
  | { kind: 'url'; url: string }
  | { kind: 'spawn'; command: string; args: readonly string[] };

export function bluetoothSettingsTarget(platform: string): BluetoothSettingsTarget {
  switch (platform) {
    case 'darwin':
      return {
        kind: 'url',
        url: 'x-apple.systempreferences:com.apple.settings.Bluetooth',
      };
    case 'win32':
      return {
        kind: 'url',
        url: 'ms-settings:bluetooth',
      };
    case 'linux':
      return {
        kind: 'spawn',
        command: 'gnome-control-center',
        args: ['bluetooth'],
      };
    default:
      return {
        kind: 'url',
        url: 'ms-settings:bluetooth',
      };
  }
}
