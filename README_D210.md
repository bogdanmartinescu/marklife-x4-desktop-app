# Marklife D210 — Standalone Integration Requirements

Implementation handoff for adding **Marklife D210** support to a cross-platform Electron thermal-printing application.

This README is self-contained. Treat it as the source of truth for D210 work.

---

## 1. Goal

Support Marklife D210 on:

- Windows
- macOS
- Linux

Connection paths:

- OS printer queue / RAW spooler
- CUPS RAW
- direct USB
- Bluetooth Classic SPP
- BLE only if a physical D210 revision actually advertises and verifies it

The D210 must be implemented as its **own device family**. It is not an X4 profile with different dimensions.

---

## 2. Confirmed research findings

Sources analyzed:

- D210 macOS driver
- D210 Windows driver package
- Marklife Android application
- comparison with X4 architecture

Confirmed baseline:

```text
Manufacturer: Marklife
Model: D210
Resolution: 203 DPI
Desktop raster protocol: ESC/POS GS v 0
Desktop raster block size: max 24 rows per command
Android Bluetooth transport: Bluetooth Classic SPP
Android Bluetooth protocol: Marklife protocol 5
```

Stable internal model ID:

```text
marklife-d210
```

Stable Bluetooth protocol ID:

```text
marklife-d210-bt-v5
```

Do not expose vendor protocol number `5` as the public model identifier.

---

## 3. Architecture

Keep these separate:

```text
Document
  ↓
Raster pipeline
  ↓
Bitmap codec
  ↓
Printer protocol
  ↓
Session
  ↓
Transport
  ↓
D210
```

Required modules:

```text
DeviceProfile
D210 settings schema
ESC/POS raster encoder
D210 Bluetooth protocol-5 encoder
D210 Bluetooth bitmap codec
route resolver
media/label compatibility resolver
native Winspool/CUPS/USB/SPP bridge
```

Do not combine protocol, transport, or settings into one universal printer object.

---

# Desktop Printing

## 4. D210 desktop protocol

The D210 desktop driver does **not** use TSPL.

Its raster filter exposes:

```text
BitmapPrintCmdPOS
```

and emits:

```text
1D 76 30 00 xL xH yL yH
```

This is standard ESC/POS:

```text
GS v 0
```

Canonical desktop route:

```text
D210
  ↓
CUPS RAW / Windows RAW
  ↓
ESC/POS GS v 0 raster
  ↓
printer
```

Do not use X4 TSPL commands for D210.

---

## 5. GS v 0 format

Command:

```text
1D 76 30 00 xL xH yL yH
```

Where:

```text
widthBytes = bytes per raster row
heightRows = number of rows in this block

xL = widthBytes & 0xFF
xH = (widthBytes >> 8) & 0xFF

yL = heightRows & 0xFF
yH = (heightRows >> 8) & 0xFF
```

The binary raster follows immediately after the header.

Implement byte-safe encoding only. Never convert the binary payload through strings.

---

## 6. Vendor-compatible 24-row chunking

The D210 desktop driver sends raster data in blocks of at most:

```text
24 rows
```

Required compatibility algorithm:

```text
while rowsRemaining >= 24:
    emit GS v 0
    height = 24
    append exactly 24 raster rows

if rowsRemaining > 0:
    emit GS v 0
    height = rowsRemaining
    append remaining rows
```

Examples:

```text
23 rows → 1 block: 23
24 rows → 1 block: 24
25 rows → 2 blocks: 24 + 1
48 rows → 2 blocks: 24 + 24
49 rows → 3 blocks: 24 + 24 + 1
```

Keep this behavior until physical testing proves larger blocks are safe.

---

## 7. Desktop route definition

```ts
const d210DesktopRoute = {
  id: "d210-os-escpos",
  modelId: "marklife-d210",
  protocol: "esc-pos",
  codec: "raw-mono-1bpp",
  session: "raw-stream",
  status: "candidate",
} as const;
```

Change `candidate` to `verified` only after physical D210 testing.

---

# Raster Requirements

## 8. Resolution

Confirmed:

```text
203 × 203 DPI
```

Conversion:

```ts
function mmToDots(mm: number, dpi = 203): number {
  return Math.round((mm / 25.4) * dpi);
}
```

Examples:

```text
50 mm  ≈ 400 dots
100 mm ≈ 799 dots
150 mm ≈ 1199 dots
```

Do not infer maximum printable width from DPI alone. Measure it on hardware.

---

## 9. Raster pipeline

Desktop:

```text
PDF / PNG / JPEG
  ↓
render at final target size
  ↓
white-background alpha compositing
  ↓
grayscale
  ↓
threshold / dithering
  ↓
1-bit bitmap
  ↓
row packing
  ↓
GS v 0
  ↓
24-row chunking
```

Bluetooth:

```text
same geometry
  ↓
D210-compatible bitmap representation
  ↓
D210 codec
  ↓
Marklife protocol 5
  ↓
SPP
```

Preview and final print must use the same transform model.

---

## 10. Bitmap packing

Start with a centralized compatibility configuration:

```ts
interface BitmapEncoding {
  bitOrder: "msb-first" | "lsb-first";
  blackBit: 0 | 1;
  rowAlignmentBytes: number;
}
```

Initial implementation may start with:

```text
row-major
MSB-first
1-bit pixels
```

but physical verification is mandatory for:

- bit order
- black polarity
- row padding
- orientation

Do not scatter these assumptions throughout the code.

---

## 11. Image-processing modes

D210 desktop driver exposes:

```text
None
Diffusion
Gathering
ErrorDiffusion
```

Vendor default:

```text
None
```

ThermalBridge should independently implement:

- threshold / sharp
- diffusion
- error diffusion
- auto

Keep vendor names only as compatibility metadata if useful.

---

# D210 Print Settings

## 12. Darkness

D210 desktop driver values:

```text
0
1
2
```

Vendor default:

```text
1
```

Use:

```ts
type D210Darkness = 0 | 1 | 2;
```

Never reuse X4 density values:

```text
6 / 10 / 14
```

D210 needs its own settings schema.

---

## 13. Media types

Driver exposes:

```text
0 — Continuous
1 — Label Paper
2 — Folded With Marks
3 — Tattoo Paper
4 — Label With Marks
```

Application type:

```ts
type D210MediaType =
  | "continuous"
  | "label"
  | "folded-with-marks"
  | "tattoo"
  | "label-with-marks";
```

Do not translate these into X4 TSPL `GAP` or `BLINE`.

D210 protocol logic owns their meaning.

---

## 14. Locate Before Every Page

For label media:

```text
Locate Before Every Page:
Off
On
```

Vendor default:

```text
On
```

Expose conditionally for relevant label media.

```ts
locateBeforeEveryPage: boolean;
```

---

## 15. Continuous feed controls

D210 driver exposes four independent distances:

```text
Document Begin
Page Begin
Page End
Document End
```

Range:

```text
0 ... 32 mm
```

Vendor defaults:

```text
Document Begin = 0 mm
Page Begin     = 0 mm
Page End       = 0 mm
Document End   = 12 mm
```

Schema:

```ts
interface D210FeedSettings {
  documentBeginMm: number;
  pageBeginMm: number;
  pageEndMm: number;
  documentEndMm: number;
}
```

Validate each to:

```text
0 <= value <= 32
```

Show these controls primarily for continuous media.

---

## 16. Position offsets

Observed:

```text
Horizontal: -20 ... +20 mm
Vertical:   -20 ... +20 mm
```

Default:

```text
0 / 0
```

Persist per saved printer.

---

## 17. Rotation

Supported:

```text
0°
90°
180°
270°
```

UI can additionally expose:

```text
Auto
```

but resolve Auto to a concrete value before protocol encoding.

---

## 18. Mirror

Supported:

```text
Off / On
```

Store:

```ts
mirror: boolean;
```

Keep in Advanced settings.

---

## 19. Negative

Supported:

```text
Off / On
```

Store:

```ts
negative: boolean;
```

Keep in Advanced settings.

---

## 20. Save-paper settings

Driver exposes:

```text
Save Paper Up
Save Paper Down
```

Default:

```text
Off
```

Keep in Advanced/Experimental until hardware behavior is confirmed.

---

# Label and Paper Formats

## 21. Driver-provided formats

Documents:

```text
A4
A5
B5
Letter
Legal
```

Roll formats:

```text
2-inch roll
3-inch roll
4-inch roll
8-inch roll
```

Label/photo-like formats:

```text
3 × 2 in
3 × 4 in
4 × 2 in
4 × 3 in
4 × 4 in
4 × 6 in
4 × 6.7 in
4 × 8 in
4 × 8.2 in
4.2 × 6.2 in
5 × 7 in
8 × 11 in
```

Group UI presets as:

```text
Documents
Roll Paper
Labels / Photos
Custom
```

Do not assume all listed page dimensions represent native print-head width. Scaling or driver behavior may be involved.

---

## 22. Custom formats

Support user-defined sizes.

Validation:

```text
width > 0
height > 0
width <= verified printable width
height fits route constraints
media type supports intended behavior
```

Do not infer physical dimensions from image pixel dimensions alone.

---

## 23. Source formats

Required:

```text
PDF
PNG
JPEG
```

Recommended next:

```text
SVG
WebP
clipboard image
```

Later:

```text
HTML
raw ESC/POS
CSV batch data
JSON template data
```

---

## 24. PDF support

Use PDF.js or equivalent.

Pipeline:

```text
load PDF
  ↓
select page
  ↓
read page box
  ↓
convert physical size
  ↓
render directly at final printer raster size
```

Do not print from the low-resolution UI preview.

---

## 25. PDF size detection

Convert:

```text
PDF points → mm
```

Use tolerances to suggest:

```text
A4
A5
Letter
4×6
custom
```

Do not require exact floating-point equality.

---

## 26. Fit modes

Support:

```text
Fit
Fill
Actual size
Stretch
```

Default:

```text
Fit
```

Warn that Stretch can distort barcodes.

---

# D210 Settings Schema

## 27. Desktop settings type

```ts
interface D210DesktopSettings {
  darkness: 0 | 1 | 2;

  mediaType:
    | "continuous"
    | "label"
    | "folded-with-marks"
    | "tattoo"
    | "label-with-marks";

  locateBeforeEveryPage: boolean;

  processing:
    | "none"
    | "diffusion"
    | "gathering"
    | "error-diffusion";

  feed?: {
    documentBeginMm: number;
    pageBeginMm: number;
    pageEndMm: number;
    documentEndMm: number;
  };

  offsetXmm: number;
  offsetYmm: number;

  rotation: 0 | 90 | 180 | 270;

  mirror: boolean;
  negative: boolean;

  savePaperUp?: boolean;
  savePaperDown?: boolean;
}
```

Do not create one shared printer settings object with many optional X4/P50/D210 fields.

---

## 28. Recommended defaults

```text
Resolution:            203 DPI
Darkness:              1
Processing:            None
Offsets:               0 / 0
Rotation:              Auto in UI
Mirror:                Off
Negative:              Off
Save Paper Up:         Off
Save Paper Down:       Off
```

For label media:

```text
Locate Before Page:    On
```

For continuous media:

```text
Document Begin:        0 mm
Page Begin:            0 mm
Page End:              0 mm
Document End:         12 mm
```

---

# Desktop Transport

## 29. Windows

Use RAW Winspool APIs:

```text
OpenPrinterW
StartDocPrinterW
StartPagePrinter
WritePrinter
EndPagePrinter
EndDocPrinter
ClosePrinter
```

Datatype:

```text
RAW
```

Send exact generated ESC/POS bytes.

Do not use Electron/browser print dialogs for protocol output.

---

## 30. macOS

Use CUPS RAW job submission.

Do not feed our generated ESC/POS back through the vendor raster filter.

---

## 31. Linux

Use CUPS RAW similarly.

Document system requirements when applicable:

```text
CUPS
BlueZ
udev
permissions
```

---

# Direct USB

## 32. USB route

Candidate:

```text
D210
  ↓
USB
  ↓
same ESC/POS GS v 0 stream
```

This is not verified until physical testing.

Collect:

```text
VID
PID
manufacturer
product string
serial number
interface
bulk OUT endpoint
bulk IN endpoint if present
```

Never automatically replace a Windows driver with WinUSB.

If direct USB conflicts with installed printer functionality, prefer the normal OS queue.

---

## 33. USB route definition

```ts
{
  id: "d210-usb-escpos",
  modelId: "marklife-d210",
  transport: "usb",
  protocol: "esc-pos",
  codec: "raw-mono-1bpp",
  session: "raw-stream",
  status: "candidate",
}
```

Only promote to verified after real D210 printing.

---

# Bluetooth

## 34. Confirmed Bluetooth transport

The analyzed Marklife Android app routes D210 via:

```text
Bluetooth Classic SPP
```

Standard SPP service UUID:

```text
00001101-0000-1000-8000-00805F9B34FB
```

Expected:

```text
discover
  ↓
pair if needed
  ↓
resolve RFCOMM service/channel
  ↓
connect
  ↓
send Marklife D210 protocol 5
```

---

## 35. D210 Bluetooth protocol

Android app resolves:

```text
D210 → protocol 5
```

Canonical internal protocol name:

```text
marklife-d210-bt-v5
```

Important:

```text
D210 SPP != generic ESC/POS
```

Do not silently send the desktop ESC/POS stream over SPP.

---

## 36. Protocol-5 command areas

Observed mobile protocol concepts:

```text
paper/page type
density gear
density
wake
enable printer
bitmap block
print-line dots
stop
return paper
position/location
forward movement
```

Implement these in:

```text
printer-protocols/marklife/d210-bluetooth/
```

Do not mix protocol commands into the generic Bluetooth transport.

---

## 37. D210 Bluetooth bitmap codec

The Android path calls:

```text
DFunction.code(...)
```

The bundled native library contains:

```text
code
decode
compress
compress2
uncompress
zlib-related functionality
```

Implication:

```text
D210 Bluetooth uses a model-specific bitmap encoding/compression path
```

Required architecture:

```text
bitmap
  ↓
independent D210 codec
  ↓
protocol-5 framing
  ↓
SPP
```

Do not:

- ship `libCode.so`
- call the APK native library
- copy decompiled implementation

Implement compatible behavior independently.

---

## 38. SPP route definition

```ts
{
  id: "d210-spp-v5",
  modelId: "marklife-d210",
  transport: "bluetooth-spp",
  protocol: "marklife-d210-bt-v5",
  codec: "marklife-d210",
  session: "marklife-spp",
  status: "candidate",
  constraints: {
    requiresPairing: true,
  },
}
```

No silent protocol fallback.

---

## 39. BLE policy

Current analyzed Android routing evidence is SPP.

Therefore:

```text
no canonical D210 BLE route
```

If a real D210 revision advertises BLE:

1. discover GATT services
2. capture UUIDs
3. verify protocol 5
4. determine packet/session behavior
5. add a candidate route
6. physically test
7. mark verified only after success

Do not infer BLE support from other Marklife printers.

---

# UI Requirements

## 40. D210 main print panel

```text
Printer
[ Marklife D210 ]

Connection
[ System Queue / USB / Bluetooth SPP ]

Paper / Format
[ preset / custom ]

Media Type
[ Continuous / Label / Folded Marks / Tattoo / Label Marks ]

Darkness
[ 0  1  2 ]

Image Processing
[ None / Diffusion / Error Diffusion / Auto ]

Locate Label
[ On / Off ]
← only when applicable

Copies
[ 1 ]

Orientation
[ Auto ]

Fit
[ Fit ]

[ Print ]
```

---

## 41. Advanced panel

```text
X Offset
Y Offset
Mirror
Negative
Document Begin feed
Page Begin feed
Page End feed
Document End feed
Save Paper Up
Save Paper Down
```

Only show feed controls when relevant.

---

## 42. Controls that must NOT appear

Do not expose:

```text
X4 speed 1..8
X4 density 6/10/14
X4 TSPL GAP/BLINE controls
P50 density levels
X4 protocol-7 settings
```

unless future D210-specific evidence independently supports them.

---

# Printer Management

## 43. Onboarding

```text
Add Printer
  ↓
System / USB / Bluetooth
  ↓
detect D210
  ↓
resolve candidate routes
  ↓
user confirms
  ↓
test print
  ↓
save printer
```

---

## 44. Saved printer state

```ts
interface SavedD210Printer {
  id: string;
  displayName: string;

  deviceProfileId: "marklife-d210";
  selectedRouteId: string;

  connection: SavedConnection;

  calibration: {
    offsetXmm: number;
    offsetYmm: number;
  };

  preferredLabelPresetId?: string;
}
```

Settings should be scoped to route.

---

## 45. Device matching

Start with names such as:

```text
D210
Marklife D210
```

Add OEM aliases only from evidence.

Return:

```ts
interface DeviceMatch {
  modelId: "marklife-d210";
  confidence: "exact" | "probable";
}
```

Name matching alone never makes a route `verified`.

---

## 46. Route resolver requirements

```text
D210 + CUPS
→ ESC/POS

D210 + Winspool
→ ESC/POS

D210 + USB
→ ESC/POS candidate

D210 + SPP
→ Marklife protocol 5

D210 + BLE
→ unresolved unless physical capability exists
```

No hidden fallbacks.

---

# Native Bridge

## 47. Rust printbridge responsibilities

Required methods:

```text
printers.list
printer.printRawFile
devices.listUsb
devices.listBluetooth
printer.printUsbFile
printer.printBluetoothFile
```

The Rust bridge owns:

```text
device discovery
permissions
connection
byte transport
timeouts
OS errors
```

The Rust bridge should **not** generate D210 ESC/POS or protocol-5 bytes.

Protocol generation belongs in TypeScript.

---

## 48. SPP session

Implement:

```text
pairing-state detection
RFCOMM connection
byte writes
optional input reads
disconnect
bounded timeout
reconnect handling
```

Use:

```text
00001101-0000-1000-8000-00805F9B34FB
```

Keep model framing out of generic SPP code.

---

# Errors

## 49. Domain errors

Recommended:

```text
D210_PROTOCOL_UNIMPLEMENTED
D210_CODEC_FAILED
D210_MEDIA_UNSUPPORTED
D210_PRINT_WIDTH_EXCEEDED
D210_FEED_OUT_OF_RANGE
D210_LOCATE_FAILED
D210_SPP_PAIRING_REQUIRED
D210_SPP_CONNECT_FAILED
D210_USB_UNAVAILABLE
D210_USB_WRITE_FAILED
D210_RAW_PRINT_FAILED
```

Normalize OS/native errors before returning them to renderer UI.

---

# Testing

## 50. ESC/POS unit tests

Mandatory cases:

```text
1 row
23 rows
24 rows
25 rows
48 rows
49 rows
```

Verify:

- GS v 0 command count
- width xL/xH
- height yL/yH
- exact payload boundaries
- final remainder block

Example:

```text
25 rows
→ 24 + 1
```

---

## 51. Bitmap tests

Fixtures:

```text
8×1
16×1
8×8
solid black
solid white
checkerboard
single black pixel
```

Compare exact bytes.

---

## 52. Settings validation tests

Verify:

```text
darkness ∈ {0,1,2}
feed values ∈ 0..32
offset values ∈ -20..20
rotation ∈ {0,90,180,270}
valid media types only
conditional locate-label control
```

---

## 53. Route tests

```text
D210 + CUPS
→ esc-pos

D210 + Winspool
→ esc-pos

D210 + USB
→ d210-usb-escpos candidate

D210 + SPP
→ marklife-d210-bt-v5

D210 + BLE without capability
→ unresolved
```

---

## 54. Protocol-5 tests

After reverse engineering protocol 5, create independent golden tests for:

```text
wake
enable
paper type
density gear
density
bitmap
print line
stop
return/feed
position
```

Keep bitmap codec vectors separate from protocol-frame vectors.

---

## 55. Integration tests

Mock:

```text
Winspool
CUPS
USB
SPP
```

CI must not require real printer hardware.

Verify:

```text
route selected
job encoded
temp file generated
bridge called
errors normalized
temp files cleaned
```

---

# Physical Verification

## 56. Test sequence

Use a real D210.

### Test 1 — RAW queue

Send minimal GS v 0 job through Windows RAW or CUPS RAW.

### Test 2 — Black polarity

Print a simple byte pattern.

Verify:

```text
blackBit
bit order
```

### Test 3 — Row order

Print 8×8 checkerboard.

### Test 4 — Chunk boundaries

Print jobs around:

```text
23
24
25
48
49 rows
```

### Test 5 — Printable width

Print full-width border/grid and measure actual width.

### Test 6 — Darkness

Print:

```text
0
1
2
```

### Test 7 — Media

Verify relevant modes:

```text
continuous
label
label with marks
folded marks
tattoo if available
```

### Test 8 — Feed

Verify all four feed distances.

### Test 9 — Direct USB

Determine VID/PID/endpoints and test desktop byte stream.

### Test 10 — SPP

Pair and connect.

### Test 11 — Protocol 5

Send independently implemented known-good protocol-5 job.

---

# Unknowns

## 57. Desktop unknowns to resolve

Do not guess:

```text
actual max printable width
bit order
black polarity
exact media-control command bytes
density-control bytes
feed command bytes
locate-label bytes
mirror behavior
negative behavior
save-paper behavior
direct USB byte-stream acceptance
```

---

## 58. Bluetooth unknowns to resolve

```text
full protocol-5 framing
DFunction.code-compatible algorithm
compression format
paper-type mapping
density-gear mapping
density mapping
wake sequence
enable sequence
bitmap block format
print-line format
stop command
return-paper command
position/location behavior
status/ack behavior
SPP readiness behavior
```

---

## 59. Hardware/revision unknowns

```text
USB VID
USB PID
USB interface/endpoints
OEM aliases
firmware variations
any D210 BLE revision
```

Record all verified values in documentation.

---

# Clean-room Requirements

## 60. Mandatory rules

Do not:

```text
bundle Marklife driver binaries
bundle libCode.so
bundle APK code
copy decompiled vendor source
invent unknown protocol fields
claim a candidate route is verified
```

Allowed implementation basis:

```text
documented ESC/POS behavior
observable driver output
controlled device captures
protocol comparisons
independent code
```

---

# Repository Layout

## 61. Suggested structure

```text
packages/
├── thermal-core/
│   └── bitmap/
│
├── bitmap-codecs/
│   └── marklife-d210/
│
├── printer-protocols/
│   ├── esc-pos/
│   │   ├── gs-v0.ts
│   │   ├── raster-chunker.ts
│   │   └── encoder.ts
│   │
│   └── marklife/
│       └── d210-bluetooth/
│           ├── commands.ts
│           ├── framing.ts
│           ├── encoder.ts
│           └── types.ts
│
├── device-registry/
│   └── models/
│       └── marklife-d210.ts
│
├── media-profiles/
├── label-presets/
└── print-pipeline/
```

Native:

```text
native/printbridge/
├── transport/
│   ├── windows.rs
│   ├── cups.rs
│   ├── usb.rs
│   └── bluetooth_spp.rs
└── sessions/
    └── spp.rs
```

---

# Implementation Order

## 62. Required sequence

```text
1. create D210 device profile
2. create D210 settings schema
3. implement ESC/POS GS v 0 writer
4. implement max-24-row raster chunker
5. add byte-level tests
6. implement/verify mono packing
7. implement D210 media configuration
8. implement darkness 0/1/2
9. implement feed controls
10. implement offsets/rotation/mirror/negative
11. add D210 paper presets
12. wire Windows RAW + CUPS RAW
13. physically verify desktop route
14. measure actual printable width
15. add direct USB candidate route
16. identify USB VID/PID/interfaces/endpoints
17. physically verify USB
18. implement SPP discovery + connection
19. create protocol-5 skeleton
20. reverse engineer protocol-5 frame commands
21. reverse engineer D210 bitmap codec
22. add protocol/codec golden vectors
23. physically verify SPP printing
24. implement calibration
25. add diagnostics
26. harden errors/disconnect/reconnect
```

Do not start Bluetooth protocol implementation by guessing frame bytes.

---

# Acceptance Criteria

## 63. Desktop D210 acceptance

- [ ] D210 is a first-class selectable model.
- [ ] D210 uses 203 DPI.
- [ ] D210 desktop routes to ESC/POS, not TSPL.
- [ ] `GS v 0` is implemented.
- [ ] Raster chunks are max 24 rows.
- [ ] Darkness is 0/1/2.
- [ ] Vendor darkness default is 1.
- [ ] All five known media types are represented.
- [ ] Locate-before-page exists where appropriate.
- [ ] Feed controls support 0–32 mm.
- [ ] Document End defaults to 12 mm.
- [ ] Offsets support -20..+20 mm.
- [ ] Rotation supports 0/90/180/270.
- [ ] Mirror/negative are represented.
- [ ] D210 does not show X4/P50-only settings.
- [ ] PDF/PNG/JPEG work.
- [ ] Windows RAW works.
- [ ] CUPS RAW works.
- [ ] Physical output is correctly scaled.
- [ ] QR code scans.
- [ ] Code 128 scans.
- [ ] Printable width is measured/documented.

---

## 64. USB acceptance

- [ ] D210 USB device can be discovered.
- [ ] VID/PID recorded.
- [ ] Interface/endpoints recorded.
- [ ] No system driver is changed automatically.
- [ ] Direct ESC/POS route is physically tested.
- [ ] USB failures use stable domain errors.
- [ ] Route remains candidate until verified.

---

## 65. Bluetooth acceptance

- [ ] D210 is recognized as SPP-capable.
- [ ] Standard SPP UUID is supported.
- [ ] Pairing requirement is handled.
- [ ] SPP connection is stable.
- [ ] Route resolver selects `marklife-d210-bt-v5`.
- [ ] Generic ESC/POS is not silently used on SPP.
- [ ] Protocol-5 golden tests exist.
- [ ] Independent D210 codec golden tests exist.
- [ ] Physical D210 prints over SPP.
- [ ] Disconnect/reconnect is handled.
- [ ] No vendor native library ships.

---

## 66. UI acceptance

- [ ] D210 has its own settings panel.
- [ ] Unsupported X4/P50 controls are absent.
- [ ] Conditional controls appear only when relevant.
- [ ] Custom sizes work.
- [ ] Format incompatibility is surfaced.
- [ ] Calibration persists per D210 printer.
- [ ] Diagnostics show route/protocol/transport status.
- [ ] Protocol number 5 is hidden from normal UI.

---

# Diagnostics

## 67. Expose

```text
model
device profile ID
route
transport
protocol
codec
203 DPI
media type
paper size
darkness
calibration offsets
connection state
USB metadata
Bluetooth metadata
last error code
```

Do not log label/customer content by default.

---

# Prompt for the Next AI

## 68. Copy/paste implementation prompt

```text
Implement Marklife D210 support using README_D210.md as the source of truth.

Critical requirements:

1. D210 is a separate printer family, not an X4 variant.
2. D210 desktop raster printing uses ESC/POS GS v 0:
   1D 76 30 00 xL xH yL yH.
3. Reproduce vendor-compatible raster chunking of at most 24 rows per GS v 0 command.
4. D210 resolution is 203 DPI.
5. Desktop darkness values are 0, 1, 2 with vendor default 1.
6. Media modes are continuous, label, folded-with-marks, tattoo, and label-with-marks.
7. Label media supports Locate Before Every Page, default On.
8. Continuous media has Document Begin, Page Begin, Page End, and Document End
   feeds from 0 to 32 mm; Document End defaults to 12 mm.
9. Offsets are approximately -20 to +20 mm.
10. Rotation is 0/90/180/270.
11. Keep D210 settings separate from X4/P50 settings.
12. Do not expose X4 speed or density controls.
13. Marklife Android routes D210 through Bluetooth Classic SPP.
14. Standard SPP UUID is 00001101-0000-1000-8000-00805F9B34FB.
15. D210 Bluetooth resolves to Marklife protocol 5, not generic ESC/POS.
16. Do not invent protocol-5 bytes.
17. Do not bundle libCode.so or vendor binaries.
18. Direct USB using the desktop ESC/POS stream is a candidate until physically verified.
19. Do not add canonical BLE unless a real D210 revision advertises and verifies it.
20. Add byte-level tests before hardware printing.
21. Keep protocol, codec, transport, media, and device profile as separate layers.
22. Mark candidate and verified routes accurately.

Implementation order:
device profile → settings → GS v 0 → 24-row chunker → tests → RAW spooler/CUPS
→ physical desktop verification → USB → SPP → protocol 5 → D210 codec
→ Bluetooth verification → calibration → hardening.

Never guess unknown printer behavior.
```

---

# Definition of Done

## 69. Final definition

D210 integration is complete when working, physically verified routes exist for:

```text
OS queue
direct USB
Bluetooth Classic SPP
```

or when a tested route is explicitly documented as unsupported.

Desktop D210 support must remain independently usable even if Bluetooth protocol 5 is unfinished.

All unresolved behavior must remain explicitly documented rather than hidden behind guessed bytes.
