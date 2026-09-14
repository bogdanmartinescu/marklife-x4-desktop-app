import { MENU_ACTION_IDS, type MenuActionId } from '@thermalbridge/shared';
import type { Locale, MenuFitMode, Screen } from '@thermalbridge/shared';
import { asFitMode, asLabelSize, asLocale, asScreen, asString } from './command-payloads.js';

export type CommandHandlers = Record<MenuActionId, (payload?: unknown) => void>;

export interface PreviewCommandsHandle {
  zoomIn(): void;
  zoomOut(): void;
  zoomActual(): void;
  openPalette(): void;
  openIconPicker(): void;
  pickImage(): void;
}

export interface AppCommandActions {
  openFile(): void;
  saveTemplate(): void;
  applyTemplate(id: string): void;
  exportDiagnostics(): void;
  duplicate(): void;
  deleteSelected(): void;
  deselect(): void;
  addText(): void;
  addQr(): void;
  addBarcode(): void;
  addRect(): void;
  addLine(): void;
  addCircle(): void;
  addArrow(): void;
  addTable(): void;
  addField(): void;
  setLabelSize(size: { widthMm: number; heightMm: number }): void;
  addPage(): void;
  duplicatePage(): void;
  deletePage(): void;
  setFitMode(mode: MenuFitMode): void;
  rotateLeft(): void;
  rotateRight(): void;
  enhance(): void;
  revertEnhance(): void;
  print(): void;
  testPage(): void;
  connectPrinter(): void;
  selectPrinter(id: string): void;
  selectProfile(id: string): void;
  setScreen(screen: Screen): void;
  toggleGrid(): void;
  setLocale(locale: Locale): void;
  openAbout(): void;
}

export function createCommandHandlers(options: {
  actions: () => AppCommandActions;
  preview: () => PreviewCommandsHandle | null;
}): CommandHandlers {
  const act = (): AppCommandActions => options.actions();
  const preview = (): PreviewCommandsHandle | null => options.preview();
  const afterPrintScreen = (run: () => void): void => {
    act().setScreen('print');
    setTimeout(run, 0);
  };
  return {
    'file.open': () => act().openFile(),
    'file.saveTemplate': () => act().saveTemplate(),
    'file.applyTemplate': (payload) => {
      const id = asString(payload);
      if (id) {
        act().applyTemplate(id);
      }
    },
    'file.exportDiagnostics': () => act().exportDiagnostics(),
    'edit.duplicate': () => act().duplicate(),
    'edit.delete': () => act().deleteSelected(),
    'edit.deselect': () => act().deselect(),
    'insert.text': () => act().addText(),
    'insert.qr': () => act().addQr(),
    'insert.barcode': () => act().addBarcode(),
    'insert.box': () => act().addRect(),
    'insert.line': () => act().addLine(),
    'insert.circle': () => act().addCircle(),
    'insert.arrow': () => act().addArrow(),
    'insert.icon': () => afterPrintScreen(() => preview()?.openIconPicker()),
    'insert.image': () => afterPrintScreen(() => preview()?.pickImage()),
    'insert.table': () => act().addTable(),
    'insert.field': () => act().addField(),
    'label.size': (payload) => {
      const size = asLabelSize(payload);
      if (size) {
        act().setLabelSize(size);
      }
    },
    'label.addPage': () => act().addPage(),
    'label.duplicatePage': () => act().duplicatePage(),
    'label.deletePage': () => act().deletePage(),
    'label.fitMode': (payload) => {
      const mode = asFitMode(payload);
      if (mode) {
        act().setFitMode(mode);
      }
    },
    'label.rotateLeft': () => act().rotateLeft(),
    'label.rotateRight': () => act().rotateRight(),
    'label.enhance': () => act().enhance(),
    'label.revertEnhance': () => act().revertEnhance(),
    'print.print': () => act().print(),
    'print.testPage': () => act().testPage(),
    'print.connect': () => act().connectPrinter(),
    'print.selectPrinter': (payload) => {
      const id = asString(payload);
      if (id) {
        act().selectPrinter(id);
      }
    },
    'print.selectProfile': (payload) => {
      const id = asString(payload);
      if (id) {
        act().selectProfile(id);
      }
    },
    'view.screen': (payload) => {
      const screen = asScreen(payload);
      if (screen) {
        act().setScreen(screen);
      }
    },
    'view.zoomIn': () => afterPrintScreen(() => preview()?.zoomIn()),
    'view.zoomOut': () => afterPrintScreen(() => preview()?.zoomOut()),
    'view.zoomActual': () => afterPrintScreen(() => preview()?.zoomActual()),
    'view.toggleGrid': () => act().toggleGrid(),
    'view.commandPalette': () => afterPrintScreen(() => preview()?.openPalette()),
    'view.language': (payload) => {
      const locale = asLocale(payload);
      if (locale) {
        act().setLocale(locale);
      }
    },
    'help.about': () => act().openAbout(),
    'help.learnMore': () => undefined,
  };
}

export function commandHandlerIds(handlers: CommandHandlers): MenuActionId[] {
  return Object.keys(handlers) as MenuActionId[];
}

export function assertCommandHandlerCoverage(handlers: CommandHandlers): void {
  const ids = new Set(commandHandlerIds(handlers));
  for (const id of MENU_ACTION_IDS) {
    if (!ids.has(id)) {
      throw new Error(`Missing command handler: ${id}`);
    }
  }
}
