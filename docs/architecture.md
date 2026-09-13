# Architecture

ThermalBridge splits label rendering from printer transport.

```text
SOURCE (PDF / PNG / JPEG)
        ↓
DOCUMENT RENDERING (renderer, PDF.js / Canvas at target DPI)
        ↓
RGBA IMAGE
        ↓
thermal-core (grayscale, dither, pack, TSPL)
        ↓
.prn bytes (Uint8Array)
        ↓
Electron main writes a temp file
        ↓
printbridge (NDJSON sidecar)
        ↓
Winspool / CUPS / TCP / USB / Bluetooth
        ↓
DEVICE
```

## Packages

- `@thermalbridge/thermal-core` — pure TypeScript raster + TSPL. No Electron or Node imports.
- `@thermalbridge/printer-profiles` — Marklife X4 and generic 203 DPI TSPL defaults.
- `@thermalbridge/shared` — IPC channels, settings, error codes, printer types, menu command registry, and the pure `buildMenuTemplate` builder.
- `@thermalbridge/cli` — `pnpm label:build` proof of concept.
- `@thermalbridge/desktop` — Electron main, sandboxed renderer, preload API.
- `native/printbridge` — Rust sidecar for discovery and RAW transport.

## Security

The renderer has `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`. It can only call the typed `window.thermalBridge` API. Shell, arbitrary filesystem access, and raw bridge commands are not exposed.
