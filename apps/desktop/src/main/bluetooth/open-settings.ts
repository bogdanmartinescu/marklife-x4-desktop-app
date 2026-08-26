import { spawn } from 'node:child_process';
import { shell } from 'electron';
import { ThermalBridgeError } from '@thermalbridge/shared';
import { bluetoothSettingsTarget } from './settings-target.js';

export async function openBluetoothSettings(platform: NodeJS.Platform = process.platform): Promise<void> {
  const target = bluetoothSettingsTarget(platform);
  try {
    if (target.kind === 'url') {
      await shell.openExternal(target.url);
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const child = spawn(target.command, [...target.args], {
        detached: true,
        stdio: 'ignore',
      });
      child.once('error', reject);
      child.once('spawn', () => {
        child.unref();
        resolve();
      });
    });
  } catch (error: unknown) {
    throw new ThermalBridgeError(
      'BLUETOOTH_PAIRING_FAILED',
      error instanceof Error ? error.message : 'Failed to open Bluetooth settings',
    );
  }
}
