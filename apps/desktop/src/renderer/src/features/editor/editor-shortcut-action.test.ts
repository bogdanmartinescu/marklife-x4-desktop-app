import { describe, expect, it } from 'vitest';
import { editorShortcutAction } from './editor-shortcut-action.js';

describe('editorShortcutAction', () => {
  it('maps single keys and ignores modifier shortcuts handled by the native menu', () => {
    expect(editorShortcutAction({ key: 't', metaKey: false, ctrlKey: false })).toBe('insert.text');
    expect(editorShortcutAction({ key: 'Escape', metaKey: false, ctrlKey: false })).toBe(
      'edit.deselect',
    );
    expect(editorShortcutAction({ key: 'Backspace', metaKey: false, ctrlKey: false })).toBe(
      'edit.delete',
    );
    expect(editorShortcutAction({ key: 'k', metaKey: true, ctrlKey: false })).toBeNull();
    expect(editorShortcutAction({ key: 'd', metaKey: true, ctrlKey: false })).toBeNull();
    expect(editorShortcutAction({ key: 'o', metaKey: true, ctrlKey: false })).toBeNull();
  });
});
