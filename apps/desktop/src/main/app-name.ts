export const APP_DISPLAY_NAME = 'ThermalBridge';

export function applyAppDisplayName(target: { setName(name: string): void }): void {
  target.setName(APP_DISPLAY_NAME);
}
