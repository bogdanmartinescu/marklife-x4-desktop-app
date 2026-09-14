# Shared folder sync

ThermalBridge can keep **templates and media** in sync across multiple laptops
by pointing each machine at the same folder that a cloud-storage client
(Dropbox, iCloud Drive, OneDrive, …) already keeps synchronised.

No Dropbox SDK or OAuth is used. The app treats the folder like any local
directory.

## What syncs / what stays local

| Data | Shared folder | Local userData |
|---|:---:|:---:|
| Label templates | ✓ | — |
| Media library (images, PDFs) | ✓ | — |
| Print history & previews | — | ✓ |
| Printer bindings (USB / BLE / CUPS) | — | ✓ |
| App preferences (locale, defaults) | — | ✓ |
| Logs & temp jobs | — | ✓ |

## Folder layout

```
<chosen-folder>/
├── thermalbridge-library.json   ← marker (identifies this as a TB folder)
├── media.json                   ← media manifest (atomically written)
├── media/
│   └── med-<uuid>.bin           ← raw file bytes (any supported MIME)
├── templates.json               ← template manifest (atomically written)
└── templates/
    └── tpl-<uuid>.json          ← full template JSON
```

History stays at `{userData}/library/history/` on each machine.

## Enabling sync

1. Open **Library** in the sidebar.
2. Click **Use Dropbox folder…** in the _Shared folder_ card.
3. In the folder picker, navigate to (or create) a folder inside your Dropbox.
   ThermalBridge suggests `{Dropbox}/ThermalBridge` automatically if it finds a
   Dropbox root on this machine.
4. Local templates and media are merged into the shared folder; duplicates are
   skipped by content hash.

## Disabling sync

Click **Stop syncing** in the card. The shared media and templates are copied
back to local storage so the machine keeps a full offline copy.

## Conflict handling

Manifests are written atomically (tmp-file + rename) to reduce the window in
which Dropbox can observe a half-written file.

If Dropbox creates a `*conflicted copy*` file, a warning banner appears in the
Library pane. The canonical `media.json` / `templates.json` filenames are used;
the last write wins. To recover: remove or rename the conflict files in Dropbox,
then re-open ThermalBridge on each machine.

**Avoid editing the same template on two machines at the same time.**

## Using other cloud folders

Any folder works — iCloud Drive, OneDrive, a network share — as long as the
same files are visible on each machine. Use the same _Use Dropbox folder…_
button and pick any directory.

## Architecture notes

- `packages/shared/src/settings.ts` — `syncFolderPath?: string` (machine-local,
  not shared).
- `apps/desktop/src/main/library/sync-folder.ts` — detect Dropbox roots,
  atomic JSON writes, merge helpers.
- `apps/desktop/src/main/library/sync-ipc.ts` — IPC registration
  (`sync:status`, `sync:chooseFolder`, `sync:disconnect`, `library:changed`
  push).
- `apps/desktop/src/main/library/store.ts` — `LibraryStore({ localDir, sharedDir })`
  separates history (local) from media and templates (shared).
