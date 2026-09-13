import { Menu, shell, type MenuItemConstructorOptions } from 'electron';
import {
  buildMenuTemplate,
  MenuCommandSchema,
  type MenuCommand,
  type MenuItemSpec,
  type MenuPlatform,
  type MenuState,
} from '@thermalbridge/shared';

const LEARN_MORE_URL = 'https://github.com/bogdanmartinescu/marklife-x4-desktop-app';

export interface ApplyMenuOptions {
  state: MenuState;
  isDev: boolean;
  sendCommand: (command: MenuCommand) => void;
}

export function applyApplicationMenu(options: ApplyMenuOptions): void {
  const platform = menuPlatform();
  const template = buildMenuTemplate({
    state: options.state,
    locale: options.state.locale,
    platform,
    isDev: options.isDev,
  });
  Menu.setApplicationMenu(
    Menu.buildFromTemplate(template.map((item) => toElectronItem(item, options.sendCommand))),
  );
}

function menuPlatform(): MenuPlatform {
  if (process.platform === 'darwin') {
    return 'darwin';
  }
  if (process.platform === 'win32') {
    return 'win32';
  }
  return 'linux';
}

function toElectronItem(
  item: MenuItemSpec,
  sendCommand: (command: MenuCommand) => void,
): MenuItemConstructorOptions {
  if (item.type === 'separator') {
    return { type: 'separator' };
  }
  if (item.action === 'help.learnMore') {
    return {
      ...(item.label !== undefined ? { label: item.label } : {}),
      ...(item.enabled !== undefined ? { enabled: item.enabled } : {}),
      click: () => {
        void shell.openExternal(LEARN_MORE_URL);
      },
    };
  }
  const submenu = item.submenu?.map((child) => toElectronItem(child, sendCommand));
  return {
    ...(item.type !== undefined ? { type: item.type } : {}),
    ...(item.id !== undefined ? { id: item.id } : {}),
    ...(item.label !== undefined ? { label: item.label } : {}),
    ...(item.role !== undefined ? { role: item.role } : {}),
    ...(item.accelerator !== undefined ? { accelerator: item.accelerator } : {}),
    ...(item.registerAccelerator !== undefined
      ? { registerAccelerator: item.registerAccelerator }
      : {}),
    ...(item.enabled !== undefined ? { enabled: item.enabled } : {}),
    ...(item.checked !== undefined ? { checked: item.checked } : {}),
    ...(submenu !== undefined ? { submenu } : {}),
    ...(item.action !== undefined
      ? {
          click: () => {
            sendCommand(
              MenuCommandSchema.parse({
                action: item.action,
                ...(item.payload !== undefined ? { payload: item.payload } : {}),
              }),
            );
          },
        }
      : {}),
  };
}
