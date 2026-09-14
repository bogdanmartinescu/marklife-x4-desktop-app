# Command registry

`packages/shared/src/commands.ts` is the single source of truth for menu and editor actions.

Each `MenuActionId` has:

- a stable id (`file.open`, `insert.text`, …)
- EN and RO labels in `MENU_MESSAGES`
- an accelerator string
- `registerAccelerator` (see `docs/menus.md`)

`buildMenuTemplate(state, locale, platform)` is a pure function. The Electron adapter in `apps/desktop/src/main/menu/apply.ts` only maps the spec onto `Menu.buildFromTemplate`.

Renderer dispatch is `createCommandHandlers` + `useCommands()`. The dock, command palette, keyboard hook, top chrome, and native menu all call `run(id, payload?)`. A unit test asserts the handler map covers every registry id.

Parameterized actions (`view.screen`, `label.size`, `print.selectPrinter`, `view.language`, `label.fitMode`, `file.applyTemplate`) carry a Zod-checked payload.

`help.about` opens the in-app About dialog (maintainer: MLB DIGITAL COMMERCE SRL). `help.learnMore` is handled in main (`shell.openExternal` to GitHub).
