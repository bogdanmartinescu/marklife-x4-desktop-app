# Desktop menus

ThermalBridge uses a native Electron application menu. Labels, action ids, and accelerators live in `@thermalbridge/shared` so main and renderer stay in lockstep.

## Structure

- **ThermalBridge** (macOS) — About, Services, Hide, Hide Others, Quit
- **File** — Open, Save as Template, Apply Template, Export Diagnostics, Close/Quit
- **Edit** — Undo/Redo/Cut/Copy/Paste/Select All (Electron roles; this restores macOS clipboard shortcuts), then Duplicate, Delete, Deselect
- **Insert** — text, codes, shapes, icon, image, table, field
- **Label** — size, pages, fit mode, rotate, enhance
- **Print** — print, test page, connect, printer and profile radios
- **View** — screens `⌘1`–`⌘6`, zoom, grid, command palette, language
- **Window** (macOS) — minimize, zoom, bring all to front
- **Help** — Learn More (opens the GitHub repo). About is on Windows/Linux.

Dev-only Reload and Toggle DevTools appear on View when the app is unpackaged.

## Accelerators

Single-key shortcuts (`T Q B R L O A S I E F G`, Backspace, Delete, Escape) are shown in the menu with `registerAccelerator: false`. The renderer `useEditorShortcuts` hook handles them and ignores typing targets.

Modifier shortcuts (`CmdOrCtrl+O/S/P/D/K/1–6/=/-/0`) are registered natively and must not be handled again in the renderer hook.

## IPC

- `menu:state` — renderer invokes with a Zod-validated `MenuState`; main rebuilds `Menu.setApplicationMenu`
- `menu:command` — main pushes `{ action, payload? }` to the renderer

The renderer debounce/shallow-compares state before sending so the menu is not rebuilt on every React render.

Canvas-mutating items disable while `modalOpen` is true.

The app chrome is an icon-only left rail with tooltips, a floating editor dock (icon + label) over the canvas, and a 24rem Inspector / Print pane on the right.
