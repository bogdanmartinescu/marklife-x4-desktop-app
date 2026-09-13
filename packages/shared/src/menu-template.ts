import { commandSpec, menuLabel, menuMessage, type MenuActionId } from './commands.js';
import {
  FIT_MODES,
  SCREEN_ACCELERATORS,
  SCREEN_LABEL_KEYS,
  SCREENS,
  type MenuFitMode,
  type MenuState,
  type Screen,
} from './menu-schemas.js';
import type { Locale } from './settings.js';

export type MenuPlatform = 'darwin' | 'win32' | 'linux';

export type MenuRole =
  | 'about'
  | 'services'
  | 'hide'
  | 'hideOthers'
  | 'unhide'
  | 'quit'
  | 'undo'
  | 'redo'
  | 'cut'
  | 'copy'
  | 'paste'
  | 'selectAll'
  | 'close'
  | 'minimize'
  | 'zoom'
  | 'front'
  | 'reload'
  | 'forceReload'
  | 'toggleDevTools'
  | 'togglefullscreen';

export type MenuActionItem = {
  type?: 'normal' | 'checkbox' | 'radio' | 'submenu';
  id?: string;
  label?: string;
  role?: MenuRole;
  accelerator?: string;
  registerAccelerator?: boolean;
  enabled?: boolean;
  checked?: boolean;
  action?: MenuActionId;
  payload?: unknown;
  submenu?: MenuItemSpec[];
};

export type MenuItemSpec = { type: 'separator' } | MenuActionItem;

export interface MenuTemplateOptions {
  state: MenuState;
  locale: Locale;
  platform: MenuPlatform;
  isDev: boolean;
}

function actionItem(
  id: MenuActionId,
  locale: Locale,
  extras?: Partial<MenuActionItem>,
): MenuItemSpec {
  const spec = commandSpec(id);
  return {
    ...extras,
    id,
    label: extras?.label ?? menuLabel(id, locale),
    action: id,
    ...(spec.accelerator !== '' ? { accelerator: spec.accelerator } : {}),
    ...(spec.registerAccelerator ? {} : { registerAccelerator: false }),
  };
}

function canvasEnabled(state: MenuState): boolean {
  return !state.modalOpen;
}

export function buildMenuTemplate(options: MenuTemplateOptions): MenuItemSpec[] {
  const { state, locale, platform, isDev } = options;
  const menus: MenuItemSpec[] = [];

  if (platform === 'darwin') {
    menus.push({
      label: menuMessage('appMenu', locale),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  menus.push(fileMenu(state, locale, platform));
  menus.push(editMenu(state, locale));
  menus.push(insertMenu(state, locale));
  menus.push(labelMenu(state, locale));
  menus.push(printMenu(state, locale));
  menus.push(viewMenu(state, locale, isDev));

  if (platform === 'darwin') {
    menus.push({
      label: menuMessage('windowMenu', locale),
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }],
    });
  }

  menus.push({
    label: menuMessage('helpMenu', locale),
    submenu: [
      ...(platform === 'darwin' ? [] : [{ role: 'about' as const }, { type: 'separator' as const }]),
      actionItem('help.learnMore', locale),
    ],
  });

  return menus;
}

function fileMenu(state: MenuState, locale: Locale, platform: MenuPlatform): MenuItemSpec {
  const applyTemplate: MenuItemSpec = {
    label: menuLabel('file.applyTemplate', locale),
    submenu:
      state.templates.length === 0
        ? [{ label: '—', enabled: false }]
        : state.templates.map((template) => ({
            label: template.name,
            action: 'file.applyTemplate' as const,
            payload: template.id,
            enabled: canvasEnabled(state),
          })),
  };
  return {
    label: menuMessage('fileMenu', locale),
    submenu: [
      actionItem('file.open', locale, { enabled: !state.modalOpen }),
      actionItem('file.saveTemplate', locale, { enabled: canvasEnabled(state) }),
      applyTemplate,
      actionItem('file.exportDiagnostics', locale, { enabled: !state.modalOpen }),
      { type: 'separator' },
      platform === 'darwin' ? { role: 'close' } : { role: 'quit' },
    ],
  };
}

function editMenu(state: MenuState, locale: Locale): MenuItemSpec {
  return {
    label: menuMessage('editMenu', locale),
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
      { type: 'separator' },
      actionItem('edit.duplicate', locale, {
        enabled: canvasEnabled(state) && state.hasSelection,
      }),
      actionItem('edit.delete', locale, { enabled: canvasEnabled(state) && state.hasSelection }),
      actionItem('edit.deselect', locale, { enabled: canvasEnabled(state) && state.hasSelection }),
    ],
  };
}

function insertMenu(state: MenuState, locale: Locale): MenuItemSpec {
  const enabled = canvasEnabled(state);
  return {
    label: menuMessage('insertMenu', locale),
    submenu: [
      actionItem('insert.text', locale, { enabled }),
      actionItem('insert.qr', locale, { enabled }),
      actionItem('insert.barcode', locale, { enabled }),
      { type: 'separator' },
      actionItem('insert.box', locale, { enabled }),
      actionItem('insert.line', locale, { enabled }),
      actionItem('insert.circle', locale, { enabled }),
      actionItem('insert.arrow', locale, { enabled }),
      { type: 'separator' },
      actionItem('insert.icon', locale, { enabled }),
      actionItem('insert.image', locale, { enabled }),
      actionItem('insert.table', locale, { enabled }),
      actionItem('insert.field', locale, { enabled }),
    ],
  };
}

function labelMenu(state: MenuState, locale: Locale): MenuItemSpec {
  const enabled = canvasEnabled(state);
  const sizes =
    state.labelSizes.length === 0
      ? [{ label: '—', enabled: false }]
      : state.labelSizes.map((size) => ({
          type: 'radio' as const,
          label: size.displayName,
          action: 'label.size' as const,
          payload: { widthMm: size.widthMm, heightMm: size.heightMm },
          checked:
            size.widthMm === state.activeLabelSize.widthMm &&
            size.heightMm === state.activeLabelSize.heightMm,
          enabled,
        }));
  const fitKeys: Record<MenuFitMode, 'labelFit' | 'labelFill' | 'labelActual' | 'labelStretch'> = {
    fit: 'labelFit',
    fill: 'labelFill',
    actual: 'labelActual',
    stretch: 'labelStretch',
  };
  return {
    label: menuMessage('labelMenu', locale),
    submenu: [
      { label: menuLabel('label.size', locale), submenu: sizes },
      { type: 'separator' },
      actionItem('label.addPage', locale, { enabled }),
      actionItem('label.duplicatePage', locale, { enabled }),
      actionItem('label.deletePage', locale, { enabled: enabled && state.pageCount > 1 }),
      { type: 'separator' },
      {
        label: menuLabel('label.fitMode', locale),
        submenu: FIT_MODES.map((mode) => ({
          type: 'radio' as const,
          label: menuMessage(fitKeys[mode], locale),
          action: 'label.fitMode' as const,
          payload: mode,
          checked: state.fitMode === mode,
          enabled,
        })),
      },
      actionItem('label.rotateLeft', locale, { enabled: enabled && state.hasSource }),
      actionItem('label.rotateRight', locale, { enabled: enabled && state.hasSource }),
      { type: 'separator' },
      actionItem('label.enhance', locale, { enabled: enabled && state.hasSource && !state.isEnhanced }),
      actionItem('label.revertEnhance', locale, {
        enabled: enabled && state.hasSource && state.isEnhanced,
      }),
    ],
  };
}

function printMenu(state: MenuState, locale: Locale): MenuItemSpec {
  const printers =
    state.printers.length === 0
      ? [{ label: '—', enabled: false }]
      : state.printers.map((printer) => ({
          type: 'radio' as const,
          label: printer.name,
          action: 'print.selectPrinter' as const,
          payload: printer.id,
          checked: printer.id === state.activePrinterId,
          enabled: !state.modalOpen,
        }));
  const profiles =
    state.profiles.length === 0
      ? [{ label: '—', enabled: false }]
      : state.profiles.map((profile) => ({
          type: 'radio' as const,
          label: profile.displayName,
          action: 'print.selectProfile' as const,
          payload: profile.id,
          checked: profile.id === state.activeProfileId,
          enabled: !state.modalOpen,
        }));
  return {
    label: menuMessage('printMenu', locale),
    submenu: [
      actionItem('print.print', locale, { enabled: !state.modalOpen && state.canPrint }),
      actionItem('print.testPage', locale, { enabled: !state.modalOpen && state.canPrint }),
      { type: 'separator' },
      actionItem('print.connect', locale, { enabled: !state.modalOpen }),
      { label: menuLabel('print.selectPrinter', locale), submenu: printers },
      { label: menuLabel('print.selectProfile', locale), submenu: profiles },
    ],
  };
}

function viewMenu(state: MenuState, locale: Locale, isDev: boolean): MenuItemSpec {
  const screens: MenuItemSpec[] = SCREENS.map((screen) => ({
    type: 'radio' as const,
    label: menuMessage(SCREEN_LABEL_KEYS[screen], locale),
    accelerator: SCREEN_ACCELERATORS[screen],
    action: 'view.screen' as const,
    payload: screen,
    checked: state.screen === screen,
    enabled: !state.modalOpen,
  }));
  const languages: MenuItemSpec[] = [
    {
      type: 'radio',
      label: menuMessage('languageEn', locale),
      action: 'view.language',
      payload: 'en',
      checked: state.locale === 'en',
      enabled: !state.modalOpen,
    },
    {
      type: 'radio',
      label: menuMessage('languageRo', locale),
      action: 'view.language',
      payload: 'ro',
      checked: state.locale === 'ro',
      enabled: !state.modalOpen,
    },
  ];
  const items: MenuItemSpec[] = [
    ...screens,
    { type: 'separator' },
    actionItem('view.zoomIn', locale, { enabled: !state.modalOpen }),
    actionItem('view.zoomOut', locale, { enabled: !state.modalOpen }),
    actionItem('view.zoomActual', locale, { enabled: !state.modalOpen }),
    {
      ...actionItem('view.toggleGrid', locale, { enabled: !state.modalOpen }),
      type: 'checkbox',
      checked: state.showGrid,
    },
    { type: 'separator' },
    actionItem('view.commandPalette', locale, { enabled: !state.modalOpen }),
    { label: menuLabel('view.language', locale), submenu: languages },
  ];
  if (isDev) {
    items.push({ type: 'separator' }, { role: 'reload' }, { role: 'toggleDevTools' });
  }
  return {
    label: menuMessage('viewMenu', locale),
    submenu: items,
  };
}

export function findActionItems(items: MenuItemSpec[], action: MenuActionId): MenuActionItem[] {
  const found: MenuActionItem[] = [];
  for (const item of items) {
    if (item.type !== 'separator' && item.action === action) {
      found.push(item);
    }
    if (item.type !== 'separator' && item.submenu !== undefined) {
      found.push(...findActionItems(item.submenu, action));
    }
  }
  return found;
}

export function menuLabels(items: MenuItemSpec[]): string[] {
  return items.flatMap((item) => {
    if (item.type === 'separator') {
      return [];
    }
    const own = item.label !== undefined ? [item.label] : [];
    const nested = item.submenu !== undefined ? menuLabels(item.submenu) : [];
    return [...own, ...nested];
  });
}

export function isScreen(value: unknown): value is Screen {
  return typeof value === 'string' && (SCREENS as readonly string[]).includes(value);
}
