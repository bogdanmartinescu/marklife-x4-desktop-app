import { describe, expect, it } from 'vitest';
import { buildMenuTemplate, findActionItems, menuLabels } from '../src/menu-template.js';
import { DEFAULT_MENU_STATE, type MenuState } from '../src/menu-schemas.js';

function build(overrides: Partial<MenuState> = {}, platform: 'darwin' | 'win32' | 'linux' = 'darwin') {
  return buildMenuTemplate({
    state: { ...DEFAULT_MENU_STATE, ...overrides },
    locale: overrides.locale ?? 'en',
    platform,
    isDev: false,
  });
}

describe('buildMenuTemplate', () => {
  it('includes a macOS app menu and omits it on Windows', () => {
    const mac = menuLabels(build({}, 'darwin'));
    const win = menuLabels(build({}, 'win32'));
    expect(mac).toContain('ThermalBridge');
    expect(win).not.toContain('ThermalBridge');
    expect(win).toContain('File');
    expect(findActionItems(build({}, 'darwin'), 'help.about')).toHaveLength(1);
    expect(findActionItems(build({}, 'win32'), 'help.about')).toHaveLength(1);
    expect(menuLabels(build({}, 'win32'))).toContain('About ThermalBridge');
  });

  it('registers modifier accelerators and leaves single keys unregistered', () => {
    const items = build();
    const open = findActionItems(items, 'file.open')[0];
    const text = findActionItems(items, 'insert.text')[0];
    expect(open).toMatchObject({ accelerator: 'CmdOrCtrl+O' });
    expect(open && 'registerAccelerator' in open ? open.registerAccelerator : undefined).toBeUndefined();
    expect(text).toMatchObject({ accelerator: 'T', registerAccelerator: false });
  });

  it('disables selection actions when nothing is selected', () => {
    const items = build({ hasSelection: false });
    expect(findActionItems(items, 'edit.duplicate')[0]).toMatchObject({ enabled: false });
    expect(findActionItems(items, 'edit.delete')[0]).toMatchObject({ enabled: false });
  });

  it('enables selection actions when a canvas item is selected', () => {
    const items = build({ hasSelection: true });
    expect(findActionItems(items, 'edit.duplicate')[0]).toMatchObject({ enabled: true });
  });

  it('marks the active printer and fit mode as radio-checked', () => {
    const items = build({
      printers: [{ id: 'a', name: 'X4' }],
      activePrinterId: 'a',
      fitMode: 'fill',
    });
    expect(findActionItems(items, 'print.selectPrinter')[0]).toMatchObject({
      checked: true,
      payload: 'a',
    });
    expect(findActionItems(items, 'label.fitMode').find((item) => item.payload === 'fill')).toMatchObject({
      checked: true,
    });
  });

  it('checks the grid item from state', () => {
    const items = build({ showGrid: true });
    expect(findActionItems(items, 'view.toggleGrid')[0]).toMatchObject({
      type: 'checkbox',
      checked: true,
    });
  });

  it('localizes labels for Romanian', () => {
    const items = build({ locale: 'ro' }, 'win32');
    expect(menuLabels(items)).toContain('Fișier');
    expect(menuLabels(items)).toContain('Deschide…');
  });

  it('includes DevTools only in development', () => {
    const prod = buildMenuTemplate({
      state: DEFAULT_MENU_STATE,
      locale: 'en',
      platform: 'darwin',
      isDev: false,
    });
    const dev = buildMenuTemplate({
      state: DEFAULT_MENU_STATE,
      locale: 'en',
      platform: 'darwin',
      isDev: true,
    });
    expect(JSON.stringify(prod)).not.toContain('toggleDevTools');
    expect(JSON.stringify(dev)).toContain('toggleDevTools');
  });

  it('disables canvas mutations while a modal is open', () => {
    const items = build({ modalOpen: true, hasSelection: true, canPrint: true });
    expect(findActionItems(items, 'insert.text')[0]).toMatchObject({ enabled: false });
    expect(findActionItems(items, 'print.print')[0]).toMatchObject({ enabled: false });
  });
});
