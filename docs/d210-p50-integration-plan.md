# D210 and P50 integration plan

Do not treat these models as X4 clones with extra optional fields. README §3.5.5–3.5.6 is explicit: **settings are route-specific**. Keep both models `status: 'planned'` and keep throwing `PROTOCOL_UNIMPLEMENTED` until a capture exists. First physical proof stays **X4 OS queue + TSPL + 100×150**.

## Already in place

- Route resolver: D210 OS/USB/TCP → `esc-pos`; D210 SPP → `marklife-d210-bt-v5`; P50 SPP → `marklife-p50-bt-v3`; D210 BLE unsupported until advertised.
- Encoders refuse D210/P50 (and X4 protocol 7) instead of guessing bytes.
- Print/Test stay disabled when `profile.status === 'planned'`.

## Current contradictions

`PrinterProfile` and `PrintDraft` are one shared bag: density 0–15, speed 1–8, media `continuous | gap | black-mark`, global sizes starting at 100×150. D210/P50 profile files still look like generic 203 DPI clones. P50 always resolves SPP from the model name; the spec wants **capability-detected** Bluetooth.

---

## Phase 1 — types and profiles (no print bytes)

Replace the shared density/speed/media object with **capabilities** plus discriminated settings:

| Route | Settings type | Defaults |
|---|---|---|
| `x4-os-tspl` / USB / TCP | `X4TsplSettings` | 100×150, gap, density **14** (vendor default remains 10), speed 4 |
| `d210-os-esc-pos` / USB | `D210DesktopSettings` | darkness **0–2** default **1**; media `continuous \| label \| folded-with-marks \| tattoo \| label-with-marks`; locate-before-page On for label/marked; continuous feed 0–32 mm, document end **12 mm** |
| `p50-bt-v3` (when advertised) | `P50Settings` | 40×30 mm, Gap/Continuous only, density levels 1→3 / 2→10 / 3→14, default level **2**, **no speed** |

Bind with `RouteSettings` (`routeId` + matching settings). Do not grow `PrintDraft` with optional D210/P50 fields.

Rewrite `marklife-d210.ts` / `marklife-p50.ts` to those numbers. Add P50 aliases (`P50`, `P5OS`, `PS50`, `P50S` → `marklife-p50`). P50 hardware: 203 DPI, stock max **50 mm**, printable width **~48 mm** — never scale content to 50 mm printable.

## Phase 2 — Print pane from selected route

Render controls from the route, not the model name:

- D210 never shows TSPL density 6/10/14, speed 1–8, or GAP/BLINE fields. Size list grouped Documents / Roll / Labels / Custom.
- P50 never shows speed, D210 feed, tattoo/fold, or X4 black-mark. Default and quick sizes: 40×30, 50×30, 50×20, 40×20, 30×20; rest under More sizes.
- Persist preferences **per saved printer + route**, not one global draft.

Keep Print/Test disabled until the encoder for that route is verified.

## Phase 3 — media vs label (after the settings split)

Introduce `MediaProfile` (physical stock + sensing) and `LabelPreset` (page size), then a compatibility resolver: P50 + 100×150 is an error, not a silent scale. PDF page-size suggestion and auto-rotation come after that. P50 battery/firmware/serial/shutdown belong in a **device pane**, not print-job settings.

## Phase 4 — encoders (only after captures)

Same rule as protocol 7: no guessed payloads.

1. D210 OS: `GS v 0` (`1D 76 30 00`) in **24-row** chunks.
2. D210 SPP: protocol 5, independent of ESC/POS.
3. P50: protocol 3 last, field-by-field from `getData()`, after Bluetooth capability is actually advertised.

USB for D210 is an ESC/POS *candidate* until a device confirms it. P50 OS-queue language stays unknown — do not assume TSPL or ESC/POS.

## Implementation order

1. Discriminated settings types + Zod at IPC (X4 mapped from current draft, D210/P50 defaults only).
2. Profile data + size lists + Print pane branching; print still blocked.
3. Alias matching + P50 Bluetooth discovery (do not hard-code SPP).
4. Media/label resolver.
5. D210 ESC/POS encoder after a capture; protocol 5 after that; P50 protocol 3 last.

## Constraints

- Keep `thermal-core` free of Electron/Node imports.
- Jobs stay `Uint8Array` through the pipeline.
- Do not bundle vendor drivers or copy vendor binaries.
- Do not bury X4 hardware proof behind D210/P50 work.
