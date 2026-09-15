import { describe, expect, it, vi } from 'vitest';
import { MENU_ACTION_IDS } from '@thermalbridge/shared';
import {
  assertCommandHandlerCoverage,
  commandHandlerIds,
  createCommandHandlers,
  type AppCommandActions,
} from './command-handlers.js';

function stubActions(): AppCommandActions {
  return {
    openFile: vi.fn(),
    saveTemplate: vi.fn(),
    applyTemplate: vi.fn(),
    exportDiagnostics: vi.fn(),
    duplicate: vi.fn(),
    deleteSelected: vi.fn(),
    deselect: vi.fn(),
    addText: vi.fn(),
    addQr: vi.fn(),
    addBarcode: vi.fn(),
    addRect: vi.fn(),
    addLine: vi.fn(),
    addCircle: vi.fn(),
    addArrow: vi.fn(),
    addTable: vi.fn(),
    addField: vi.fn(),
    setLabelSize: vi.fn(),
    addPage: vi.fn(),
    duplicatePage: vi.fn(),
    deletePage: vi.fn(),
    setFitMode: vi.fn(),
    rotateLeft: vi.fn(),
    rotateRight: vi.fn(),
    enhance: vi.fn(),
    revertEnhance: vi.fn(),
    print: vi.fn(),
    testPage: vi.fn(),
    connectPrinter: vi.fn(),
    selectPrinter: vi.fn(),
    selectProfile: vi.fn(),
    setScreen: vi.fn(),
    toggleGrid: vi.fn(),
    toggleRuler: vi.fn(),
    setLocale: vi.fn(),
    openAbout: vi.fn(),
  };
}

describe('createCommandHandlers', () => {
  it('covers every MenuActionId', () => {
    const handlers = createCommandHandlers({
      actions: stubActions,
      preview: () => null,
    });
    expect(commandHandlerIds(handlers).sort()).toEqual([...MENU_ACTION_IDS].sort());
    expect(() => assertCommandHandlerCoverage(handlers)).not.toThrow();
  });

  it('dispatches parameterized commands', () => {
    vi.useFakeTimers();
    const actions = stubActions();
    const preview = {
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      zoomActual: vi.fn(),
      openPalette: vi.fn(),
      openIconPicker: vi.fn(),
      pickImage: vi.fn(),
    };
    const handlers = createCommandHandlers({
      actions: () => actions,
      preview: () => preview,
    });
    for (const id of MENU_ACTION_IDS) {
      handlers[id]();
    }
    handlers['view.screen']('library');
    handlers['view.language']('en');
    handlers['label.fitMode']('stretch');
    handlers['label.size']({ widthMm: 40, heightMm: 30 });
    handlers['print.selectPrinter']('cups:x');
    handlers['print.selectProfile']('marklife-x4');
    handlers['file.applyTemplate']('tmpl-1');
    vi.runAllTimers();
    expect(actions.setScreen).toHaveBeenCalledWith('library');
    expect(actions.setLocale).toHaveBeenCalledWith('en');
    expect(actions.setFitMode).toHaveBeenCalledWith('stretch');
    expect(actions.setLabelSize).toHaveBeenCalledWith({ widthMm: 40, heightMm: 30 });
    expect(actions.selectPrinter).toHaveBeenCalledWith('cups:x');
    expect(actions.selectProfile).toHaveBeenCalledWith('marklife-x4');
    expect(actions.applyTemplate).toHaveBeenCalledWith('tmpl-1');
    expect(actions.openAbout).toHaveBeenCalled();
    expect(preview.openPalette).toHaveBeenCalled();
    expect(preview.openIconPicker).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('rejects incomplete handler maps', () => {
    expect(() =>
      assertCommandHandlerCoverage({ 'file.open': () => undefined } as never),
    ).toThrow(/Missing command handler/);
  });
});
