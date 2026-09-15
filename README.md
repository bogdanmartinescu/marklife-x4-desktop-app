<div align="center">
  <img src="docs/banner.jpg" alt="ThermalBridge — Desktop label editor for thermal printers" width="100%">
</div>

<br>

<div align="center">

[![Release](https://img.shields.io/github/v/release/bogdanmartinescu/thermal-bridge?style=flat-square)](https://github.com/bogdanmartinescu/thermal-bridge/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/bogdanmartinescu/thermal-bridge/test.yml?branch=master&style=flat-square&label=CI)](https://github.com/bogdanmartinescu/thermal-bridge/actions)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue?style=flat-square)](#installation)
[![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey?style=flat-square)](#license)

</div>

---

## Overview

**ThermalBridge** is a cross-platform desktop application for designing, managing, and printing thermal and inkjet labels. It connects directly to your printer over USB, Bluetooth (BLE and Classic SPP), Wi-Fi / TCP, or through the OS print queue — no cloud, no subscription, no vendor lock-in.

Key highlights:

- **Label editor** — drag-and-drop canvas with text, barcodes (1D/QR), images, and table fields
- **Template library** — save reusable label designs; sync across machines via Dropbox or any shared folder
- **Print history** — per-job audit log with reprint support
- **AWB / shipping labels** — built-in test page and sample AWB for courier workflows (Cargus, Fan Courier, etc.)
- **PDF & image import** — render any PDF page or raster image directly to the print head
- **Multi-language UI** — English and Romanian (easily extensible)

---

## Supported printers

| Printer | Status | Resolution | Print language | Connectivity |
|---------|:------:|:----------:|---------------|-------------|
| **Marklife X4** | ✅ Available | 203 DPI | TSPL/TSC | USB · OS queue (CUPS / Win Spooler) · TCP/IP · Bluetooth BLE · Bluetooth SPP |
| **Phomemo M110 / M120 / M220** | ✅ Available | 203 DPI | ESC/POS raster | Bluetooth BLE (GATT ff00/ff02) |
| **Canon inkjet** (PIXMA / TS / G / TR) | ✅ Available | 300 DPI | Color PNG via OS queue | USB · Wi-Fi (AirPrint / CUPS) |
| **Generic TSPL 203 DPI** | ✅ Available | 203 DPI | TSPL/TSC | USB · OS queue · TCP/IP |
| **Marklife D210** | 🔜 Planned | 203 DPI | ESC/POS | USB · OS queue · Bluetooth SPP |
| **Marklife P50** | 🔜 Planned | 203 DPI | TBD | USB · Bluetooth |

---

## Connectivity

ThermalBridge supports six distinct transport layers so you can reach your printer however it's physically connected:

| Transport | Description |
|-----------|-------------|
| **USB (direct)** | Native libUSB connection — bypasses the OS print queue for lowest-latency RAW jobs |
| **OS print queue** | Sends jobs through CUPS (macOS / Linux) or the Windows Spooler; works with any queue the OS already recognises |
| **TCP / IP** | Raw TCP socket to a network-connected printer or print server (configurable IP : port) |
| **Bluetooth BLE** | Bluetooth Low Energy GATT — used by Phomemo M110 family and Marklife X4 BLE mode; no pairing required |
| **Bluetooth SPP** | Classic Bluetooth Serial Port Profile — used by older Marklife devices (D210, X4 fallback); requires OS pairing |
| **Serial port** | RS-232 / USB-CDC serial — for printers exposed as COM/ttyUSB devices |

Printer bindings (transport + address) are stored per-profile and persist between sessions. A single label design can be sent to any configured printer with one click.

---

## Installation

Download the latest release for your platform from the [**Releases**](https://github.com/bogdanmartinescu/thermal-bridge/releases) page:

| Platform | Package |
|----------|---------|
| macOS (Apple Silicon) | `ThermalBridge-*-mac-arm64.dmg` |
| macOS (Intel) | `ThermalBridge-*-mac-x64.dmg` |
| Windows | `ThermalBridge-*-win-x64.exe` (NSIS installer) |
| Linux | `ThermalBridge-*-linux-x86_64.AppImage` · `.deb` |

---

## Development

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 22 LTS |
| pnpm | 11.2.x |
| Rust / Cargo | stable |

### Quick start

```bash
# Install dependencies
pnpm install

# Build the native print sidecar (printbridge)
pnpm printbridge:build

# Start in development mode (hot reload)
pnpm dev

# Run all tests
pnpm test

# Full type check
pnpm typecheck

# Lint
pnpm lint
```

### Building a distributable

```bash
# Build renderer + main process
pnpm build

# Package (without publishing)
pnpm dist
```

### Project structure

```
apps/
  desktop/          Electron application (main + renderer + preload)
packages/
  shared/           IPC channel contracts, settings schema, menu templates
  thermal-core/     Platform-independent bitmap pipeline and print-language encoders
  printer-profiles/ Printer capability definitions and transport route resolver
native/
  printbridge/      Rust sidecar — USB, TCP, BLE, SPP, serial transports
scripts/            Build helpers (version check, printbridge build, dev branding)
docs/               Additional documentation and engineering spec
```

---

## Architecture

The application is split into three layers:

1. **Renderer** (React + Vite) — label editor, library UI, printer management  
2. **Main process** (Electron / Node.js) — IPC routing, settings persistence, library storage, sync  
3. **printbridge sidecar** (Rust) — native printer transports (USB, BLE, SPP, TCP, serial); isolated from the renderer for security

The `thermal-core` package contains all bitmap processing (resize, threshold, Floyd–Steinberg dithering, rotation, mirror, negative) and print-language encoders (TSPL, ESC/POS, Phomemo ESC/POS variant). It is pure TypeScript with no Electron or Node.js imports and can be tested independently of the app.

→ See [`docs/engineering-spec.md`](docs/engineering-spec.md) for the full protocol analysis and architecture decisions.

---

## Shared folder sync

Templates and media can be synced across machines using any shared folder (Dropbox, iCloud Drive, OneDrive, network share, etc.). History, printer bindings, and settings remain local.

Enable sync from **Library → Shared folder → Use Dropbox folder…** and point it at your shared folder. ThermalBridge uses atomic file writes to avoid conflicts with cloud sync clients.

→ See [`docs/sync.md`](docs/sync.md) for details.

---

## Maintainer

**MLB Digital Commerce SRL**  
CUI: 50914870 · Calea Moșilor nr. 88, București  
[hi@mlb.ro](mailto:hi@mlb.ro) · [www.mlb.ro](https://www.mlb.ro)

---

## License

Proprietary — all rights reserved. Not for distribution without written permission.
