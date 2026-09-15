# ThermalBridge Desktop

Cross-platform desktop application for printing thermal labels directly from PDF/image sources to Marklife printers, beginning with X4 and D210, over OS printer queues, USB, Bluetooth Classic SPP, Bluetooth Low Energy (BLE), and network transports.

> **Working name:** `ThermalBridge Desktop`  
> Rename before public release if desired.

This repository is intended to be implemented as a production-grade Electron application for **Windows, macOS, and Linux**. The core label rendering and printer-language logic must be vendor-independent and written from scratch based on observable printer behavior.

---

## 1. Executive summary

Static analysis of the supplied **X4 desktop drivers**, **D210 desktop drivers**, and the **Marklife Android application V3.8.0(13)** materially changes the architecture.

The original X4 desktop-driver analysis correctly established that an X4 print job sent through the desktop driver is essentially:

```text
PDF / image / application content
        ↓
rasterize at printer DPI
        ↓
grayscale / threshold / dithering
        ↓
pack pixels into 1-bit rows
        ↓
TSPL/TSC-style command stream
        ↓
RAW printer transport
```

The X4 desktop filter emits commands including:

```text
SIZE <width> mm,<height> mm
GAP <height> mm,<offset> mm
BLINE <height> mm,<offset> mm
REFERENCE 0,0
OFFSET <n> mm
DENSITY <n>
SPEED <n>
DIRECTION 0,0
CLS
BITMAP <x>,<y>,<widthBytes>,<height>,1,<binary bitmap>
PRINT 1,<copies>
```

However, analysis of the Marklife Android app proves that **printer protocol cannot be modeled as one language permanently attached to one printer model**.

For example:

```text
Marklife X4
├── desktop queue / desktop driver path → TSPL/TSC-style raster stream
└── Android Bluetooth SPP path          → protocol 7 + JBIG-compressed binary framing

Marklife D210
├── desktop driver path                → POS/ESC-style raster path
└── Bluetooth app path                 → protocol 5 + model-specific binary framing/codec
```

Therefore the correct abstraction is:

```text
DEVICE MODEL
    +
CONNECTION TRANSPORT
    +
CAPABILITY / FIRMWARE
        ↓
ROUTE RESOLVER
        ↓
CODEC
        ↓
PRINTER PROTOCOL
        ↓
SESSION / FLOW CONTROL
        ↓
TRANSPORT
```

The application should **not embed, execute, redistribute, or depend on the supplied vendor drivers or Android native libraries**.

Instead, implement:

1. an independent document/raster engine;
2. independent bitmap codecs;
3. independent printer-protocol encoders;
4. a device registry with transport-specific routes;
5. native USB/Bluetooth/spooler/network transport support;
6. a modern Electron UI.

The recommended architecture is:

- **Electron + React + strict TypeScript** for the desktop application;
- **pure TypeScript** for geometry, raster processing, device profiles, route resolution, protocol construction, and most codecs;
- a small **Rust sidecar (`printbridge`)** for OS printer enumeration, RAW spooler/CUPS submission, USB, Bluetooth Classic SPP, BLE/GATT, and TCP/9100;
- **protocol and transport are separate abstractions**;
- **USB and Bluetooth are implemented together in the same hardware-transport phase**;
- Bluetooth must support **both SPP and BLE**, using whichever the detected printer advertises;
- BLE must support Marklife's observed service profiles and flow-control behavior rather than simply splitting bytes into arbitrary MTU-sized chunks;
- model support is added as tested `(device, transport, protocol, codec, session)` routes.

This architecture is broader than an X4 utility and gives the project a realistic path toward the same multi-model connectivity strategy used by the Marklife mobile application.

---

## Transport clarification

The target printer family must be treated as potentially supporting:

```text
OS printer queue
direct USB
Bluetooth Classic SPP
Bluetooth Low Energy
TCP/9100, where available
```

Bluetooth implementation rule:

```text
discover device
    ↓
inspect advertised capabilities
    ↓
SPP available? ─────► expose SPP route
BLE available? ─────► inspect GATT services and expose BLE route
both available? ────► expose both and apply preference/profile rules
    ↓
resolve printer model
    ↓
select protocol + codec + session behavior for that route
```

**Do not assume that the bytes used over a desktop/USB path are the same bytes used over Bluetooth.**

USB and Bluetooth remain one dedicated implementation phase because both are direct-device transports and should share discovery, identity, connection-state, diagnostics, and route-selection infrastructure.

---

# 2. Known driver findings

The following findings came from static inspection of the supplied macOS, Linux and Windows driver packages plus the Marklife Android application V3.8.0(13).

They are implementation clues, not vendor code that should be copied into this repository.

## 2.1 Printer identity

Known observable identity information:

```text
Manufacturer: Marklife
Model: X4
Class: PRINTER
Resolution: 203 DPI
```

A Linux PPD exposes an IEEE-1284-like device identification:

```text
MFG:Marklife ;
CMD:XPP,XL;
MDL:X4;
CLS:PRINTER
```

The command language emitted by the vendor raster filter is clearly TSPL/TSC-style.

---

## 2.2 macOS driver findings

The macOS installer places essentially:

```text
/Library/Printers/
├── PPDs/
│   └── Contents/
│       └── Resources/
│           └── Marklife-X4.ppd
└── Marklife/
    └── Filter/
        └── rastertoX4
```

The filter is a CUPS raster filter.

Observed CUPS-related operations include:

```text
cupsRasterOpen
cupsRasterReadHeader2
cupsRasterReadPixels
ppdOpenFile
cupsParseOptions
```

The filter emits TSPL-like commands and raw bitmap bytes.

The macOS package examined was Intel/x86_64-oriented, which is an additional reason not to depend on the vendor binary for a modern cross-platform app.

---

## 2.3 Linux driver findings

The Linux package is especially useful because it contains raster filter binaries for several architectures:

```text
x86_64
i386
armv7l
aarch64
```

Symbols visible in the Linux raster filter include names such as:

```text
BitmapErrorDiffuse
Resize
BitmapPrintCmdTSC
WriteLog
main
```

These reinforce the observed rendering pipeline:

```text
CUPS raster
  → resize / transform
  → error diffusion or threshold
  → 1-bit bitmap
  → TSC/TSPL print commands
```

---

## 2.4 Windows driver findings

The supplied Windows installers include a Marklife-branded driver and another OEM-style/YXQPOR-branded package.

This suggests that the printer may be built on an OEM platform shared by multiple brands.

Do not assume identical USB IDs across OEM variants.

The first production release should therefore identify printers primarily through the installed OS printer queue and explicit user selection, not through hard-coded USB VID/PID values.

---

## 2.5 Known printer settings

### Resolution

```text
203 × 203 DPI
```

### Media modes

Observed configuration modes:

```text
Continuous
Label With Gap
Label With Marks / Black Mark
```

Expected command mapping:

```text
Continuous       → GAP 0,0
Label with gap   → GAP <height>,<offset>
Black mark       → BLINE <height>,<offset>
```

### Density

Observed presets:

```text
6   Light
10  Normal
14  Dark
```

Default:

```text
10
```

Represent density internally as a validated integer rather than only the three UI presets.

### Speed

Observed range:

```text
1 ... 8
```

Default:

```text
4
```

### Position / transform options

Observed driver capabilities include:

```text
horizontal offset: approximately -20 mm ... +20 mm
vertical offset:   approximately -20 mm ... +20 mm

rotation:
0°
90°
180°
270°

mirror:
true / false

negative:
true / false
```

### Image processing

Observed modes include concepts corresponding to:

```text
none / threshold
diffusion
error diffusion
```

The new application should provide its own implementation rather than attempting to duplicate internal vendor code.

---

## 2.6 D210 desktop-driver findings

The supplied D210 desktop driver changes the future D210 implementation plan.

The macOS package contains a lightweight CUPS-style printer filter and PPD. The retained raster-filter symbol includes:

```text
BitmapPrintCmdPOS
```

rather than the X4 driver's:

```text
BitmapPrintCmdTSC
```

Disassembly of `BitmapPrintCmdPOS` shows that it emits the standard ESC/POS raster-image command:

```text
1D 76 30 00 xL xH yL yH
```

which is:

```text
GS v 0
```

The driver:

1. treats the image width as bytes per raster row;
2. emits width as `xL/xH`;
3. sends the bitmap in blocks of up to **24 raster rows** (`0x18`);
4. emits a final shorter block for remaining rows.

Conceptually:

```text
while rowsRemaining >= 24:
    GS v 0  mode=0  widthBytes  height=24
    <24 rows of raster bytes>

if rowsRemaining > 0:
    GS v 0  mode=0  widthBytes  height=rowsRemaining
    <remaining raster bytes>
```

The PPD confirms:

```text
Resolution: 203 × 203 DPI
```

This is substantially stronger than a generic "POS-like" inference: the D210 desktop raster path is compatible with a known ESC/POS raster primitive.

Therefore D210 must not be implemented as:

```text
Marklife X4 profile + different dimensions
```

It needs a separate ESC/POS raster adapter.

Initial route:

```text
D210 + OS queue
    ↓
ESC/POS GS v 0 raster encoder
    ↓
24-row chunking compatible with vendor driver
```

Direct USB should initially be treated as a candidate route using the same byte stream and physically verified before release.

---

## 2.7 Marklife Android application findings

Analyzed application:

```text
Package:       com.feioou.deliprint.yxq
App name:      Marklife
Version:       V3.8.0(13)
Version code:  331
Target SDK:    35
```

The application is the strongest reference for Bluetooth architecture because it supports a broad family of Marklife/OEM printer models and contains explicit device, protocol, BLE, SPP, command, and firmware layers.

### 2.7.1 Protocol-family registry

The application contains dedicated protocol classes:

```text
AiPrintProtocol
D100Protocol
D210Protocol
P12Protocol
P15Protocol
P50Protocol
P50VIOSProtocol
R15Protocol
S2Protocol
S2VIOSProtocol
S8Protocol
U4Protocol
X2BLEProtocol
X2Protocol
X4Protocol
X8Protocol
```

Observed protocol IDs:

| Protocol class | Protocol ID |
|---|---:|
| S8 | 1 |
| S2 / S2VIOS | 2 |
| P50 / P50VIOS | 3 |
| P12 | 4 |
| D210 | 5 |
| P15 | 6 |
| X4 | 7 |
| X2BLE | 8 |
| X2 | 9 |
| X8 | 10 |
| R15 | 11 |
| D100 | 12 |
| U4 | 13 |
| AiPrint | 14 |

These IDs are vendor-internal implementation identifiers. Do **not** expose them as a public API contract unless useful for diagnostics.

The important architectural conclusion is that Marklife itself uses **multiple protocol implementations**, not one universal print language.

---

### 2.7.2 Generic TSPL and ESC/POS engines also exist

The APK contains:

```text
com.yxqapp.sdk.Printer_TSPL
com.yxqapp.sdk.Printer_ESC
```

`Printer_TSPL` exposes operations corresponding to:

```text
CLS
CreatePage
Density
Direction
DrawBar
DrawBox
DrawDataMatrix
DrawPic
DrawQRCode
PrintPage
SetGap
Speed
Text
Textbox
```

`Printer_ESC` exposes ESC/POS/page-mode style operations including:

```text
createPage
Page_printBitmap
drawBarCode
feed
feedToBlack
printBitmap
printPage
printQRcode
setAbsPosition
setRotation
```

This independently supports the design decision to implement protocol engines as pluggable modules.

---

### 2.7.3 Bluetooth Classic SPP

The app opens an RFCOMM Bluetooth socket using the standard Serial Port Profile UUID:

```text
00001101-0000-1000-8000-00805F9B34FB
```

Observed flow:

```text
paired/discovered BluetoothDevice
        ↓
cancel discovery
        ↓
create RFCOMM socket
        ↓
connect
        ↓
InputStream + OutputStream
        ↓
model/session handling
        ↓
raw protocol bytes
```

This means SPP can be represented as a byte-stream transport.

However, some models contain additional session/readiness behavior, so **SPP transport must not be confused with printer protocol**.

---

### 2.7.4 BLE service profile A

The app defines:

```text
Service:
0000ff00-0000-1000-8000-00805f9b34fb

Read / RX characteristic:
0000ff01-0000-1000-8000-00805f9b34fb

Write / TX characteristic:
0000ff02-0000-1000-8000-00805f9b34fb

Control characteristic:
0000ff03-0000-1000-8000-00805f9b34fb

CCCD:
00002902-0000-1000-8000-00805f9b34fb
```

The app explicitly identifies the `ff03` characteristic as a control characteristic, `ff01` as the read characteristic, and `ff02` as the write characteristic.

---

### 2.7.5 BLE service profile B

A second observed BLE profile is:

```text
Service:
49535343-fe7d-4ae5-8fa9-9fafd205e455

Read / RX characteristic:
49535343-1e4d-4bd9-ba61-23c647249616

Write / TX characteristic:
49535343-8841-43f4-a8d4-ecbe34729bb3
```

The Android code includes special handling for some device names such as `P80`, reinforcing the need for a device/session registry instead of global UUID assumptions.

The Electron implementation should recognize both known profiles but still perform GATT service discovery.

---

### 2.7.6 Observed SPP model-name routing

The customized device-routing code explicitly classifies the following names/prefixes as SPP-connected targets:

```text
S8
D210
IP_D80
GD-88
210
X4
U4
D100
D200
DP_D80
DP_8028
HM-24-28
A31
A50
plus additional customized/AbleMark mappings
```

This list is useful for seeding discovery hints, but it must not become a hard-coded compatibility guarantee. Device revisions and OEM aliases may differ.

The route resolver should prefer actual discovered capabilities plus a model profile over name-prefix logic alone.

---

### 2.7.7 BLE packet size and flow control

The Android SDK defines:

```text
MAX_PACKET_SIZE = 240
```

It also:

- requests a larger BLE MTU;
- requests high connection priority;
- keeps `credit`, `sendPackCount`, and `receivedCreditsCount`;
- logs an initial/set credit value of `4`;
- receives control/notification data;
- includes packet pacing and timeout/resend behavior.

Therefore BLE transmission is not correctly modeled as:

```text
for each MTU chunk:
    write(chunk)
```

The new implementation requires a **BLE session/flow-control layer**:

```text
protocol payload
    ↓
session packetizer
    ↓
negotiated MTU / safe payload cap
    ↓
credit window
    ↓
write
    ↓
notification / acknowledgement
    ↓
advance window
```

Use `240` as an observed vendor maximum/capability clue, **not as an unconditional constant for every OS/printer**.

---

### 2.7.8 X4 Bluetooth protocol

The X4 mobile path is materially different from the X4 desktop TSPL path.

Two independent Android routing checks make this explicit:

```text
YXQCustomizedDevices.isConnectBySpp(...)
    → X4 is in the SPP-connected model set

GlobalDeviceContextImpl.getPrintProtocol(...)
    → X4 resolves to protocol 7
```

Therefore the Android-compatible X4 route is:

```text
X4
  ↓
Bluetooth Classic SPP
  ↓
Marklife protocol 7
  ↓
X4/JBIG binary payload
```

—not TSPL over RFCOMM.

Observed `X4Protocol.getData()` behavior:

```text
Bitmap
  ↓
convertBitmapToGrayBytes(...)
  ↓
threshold/parameter observed around 135
  ↓
JniJbigCodec
  ↓
encodeV2(width, height, ...)
  ↓
custom X4 binary header
  ↓
JBIG payload
  ↓
additional protocol framing
```

`X4Protocol.getProtocol()` returns:

```text
7
```

The bundled ARM library exports:

```text
Java_io_github_suzp1984_jbig_JniJbigCodec_encodeNativeV2
Java_io_github_suzp1984_jbig_JniJbigCodec_encodeNativeV3
```

and identifies itself as:

```text
JBIG-KIT 2.1
T.85
```

Therefore:

```text
X4 Bluetooth != raw TSPL-over-BLE
```

The X4 profile must have a Bluetooth-specific route such as:

```text
model: X4
transport: bluetooth-spp / bluetooth-ble
protocol: marklife-x4-bt-v7
codec: jbig-t85-compatible
session: marklife-bluetooth
```

while the desktop route can remain TSPL-style.

**Do not bundle or call the APK's `libjbigkit.so`.** Implement the required wire-compatible encoding independently or adopt an appropriately licensed implementation after a separate license review.

---

### 2.7.9 D210 Bluetooth protocol

The D210 mobile path is also model-specific.

The Android device-routing logic explicitly includes `D210` in its SPP-connected model set, and the D210 base device configuration selects the classic/traditional Bluetooth type.

Initial Android-compatible route:

```text
D210
  ↓
Bluetooth Classic SPP
  ↓
Marklife protocol 5
  ↓
D210-specific encoded bitmap/command stream
```

`D210Protocol.getProtocol()` returns:

```text
5
```

Observed print construction includes calls corresponding to:

```text
paper/page type
density gear
density
wake
enable printer
bitmap block
print-line dots
stop command
return paper
location
forward movement
```

The common bitmap path invokes:

```text
com.btapplication.sdk.DFunction.code(...)
```

The bundled native `libCode.so` exports:

```text
Java_com_btapplication_Code_code
Java_com_btapplication_Code_decode
compress
compress2
uncompress
```

and contains zlib functionality.

This means:

```text
D210 Bluetooth != generic ESC/POS-over-Bluetooth
```

Initial D210 route model:

```text
D210
├── desktop queue / probable direct USB → POS/ESC-style protocol
└── Bluetooth SPP/BLE route             → Marklife D210 protocol 5 + independent codec
```

Do not bundle `libCode.so`; reproduce only the wire behavior required for compatibility.

---

### 2.7.10 Device capability model

The Android app contains a real device-model abstraction with configuration objects for:

```text
Bluetooth
commands/status
print protocol
hardware dimensions
density
label creation
display/model identity
```

This is the pattern the Electron app should follow.

It is superior to a flat object like:

```ts
{ model: "X4", language: "tspl" }
```

because one model can require different protocol behavior over different transports.

---

### 2.7.11 Marklife model expansion target

The Android application gives a concrete future compatibility list:

```text
X4
D210
S8
S2
P50
P12
P15
X2
X2 BLE
X8
R15
D100
U4
AiPrint-family devices
plus OEM/variant mappings
```

This list is a **reverse-engineering roadmap**, not a claim that every listed printer is already supported.

Each route must be independently implemented and physically verified.

---



# 2.8 Multi-printer and multi-label architecture

The Android application confirms that Marklife's own software is organized around a family of printer models, each with model-specific configuration, protocol selection, hardware dimensions, paper handling, density behavior, and Bluetooth routing.

ThermalBridge should therefore target:

```text
one application
    ↓
many physical printers
    ↓
many transports
    ↓
many protocols/codecs
    ↓
many physical label/media formats
```

Do not create one Electron build per printer.

The device-selection model should be:

```text
Detected/Saved Printer
    ↓
DeviceProfile
    ↓
Available Routes
    ↓
Selected Route
    ↓
Hardware Capabilities
    ↓
Supported Media Profiles
    ↓
Selected Label Format
```

Keep these independent:

```text
printer model
transport
printer protocol
bitmap codec
physical media
label/page dimensions
sensor mode
document/template
```

---

# 3. Product goals

## 3.1 Primary goal

Create the easiest cross-platform desktop utility for printing shipping and product labels to Marklife printers, beginning with X4 and D210 and expanding through the protocol families identified in the Marklife mobile application.

A target workflow:

```text
drag PDF
  ↓
preview label
  ↓
select 100 × 150 mm
  ↓
select Marklife X4
  ↓
Print
```

No Adobe Acrobat print-dialog configuration should be necessary.

---

## 3.2 Initial supported platforms

Required:

```text
Windows 10/11 x64
macOS Apple Silicon
macOS Intel, if practical
Linux x64
```

Optional after MVP:

```text
Linux arm64
```

---

## 3.3 Initial supported content

MVP:

```text
PDF
PNG
JPEG/JPG
```

Phase 2:

```text
SVG
WebP
clipboard image
drag/drop from browser/file manager
```

Later:

```text
HTML templates
ZPL input
TSPL input
batch folders
shipping-platform integrations
```

---

## 3.4 Printer support rollout

### Foundation / first verified model

```text
Marklife X4
```

Required routes:

```text
OS printer queue → TSPL/TSC-style
direct USB       → verify whether same raw TSPL stream is accepted
Bluetooth SPP    → Marklife X4 Bluetooth protocol 7
Bluetooth BLE    → add only if a physical X4 revision advertises and verifies it
```

### Future-stage second model

```text
Marklife D210
```

Required routes:

```text
OS printer queue → POS/ESC-style
direct USB       → verify POS/ESC-style route
Bluetooth SPP    → Marklife D210 protocol 5
Bluetooth BLE    → support if actual D210 revision advertises BLE
```

### Broader Marklife compatibility

After X4 and D210 are physically verified, add device routes for the protocol families found in the Android app:

```text
S8
S2
P50
P12
P15
X2
X2 BLE
X8
R15
D100
U4
AiPrint-family devices
OEM aliases/variants
```

### Generic protocols

Retain generic profiles for:

```text
Generic TSPL 203 DPI
Generic ESC/POS raster printer
```

Longer term:

```text
ZPL
CPCL
other thermal languages
```

Do not hard-code X4 assumptions into the rendering engine.



# 3.5 Multi-printer support model

The device registry is the central source of truth for compatibility.

## 3.5.1 Marklife protocol-family roadmap

The analyzed Android app exposes these protocol families:

| Model/family | Internal protocol ID | Planned status |
|---|---:|---|
| S8 | 1 | roadmap |
| S2 / S2VIOS | 2 | roadmap |
| P50 / P50VIOS | 3 | roadmap |
| P12 | 4 | roadmap |
| D210 | 5 | second verified family |
| P15 | 6 | roadmap |
| X4 | 7 | first verified family |
| X2 BLE | 8 | roadmap |
| X2 | 9 | roadmap |
| X8 | 10 | roadmap |
| R15 | 11 | roadmap |
| D100 | 12 | roadmap |
| U4 | 13 | roadmap |
| AiPrint | 14 | roadmap |

Use stable internal IDs such as:

```text
marklife-x4
marklife-d210
marklife-s8
marklife-s2
marklife-p50
...
```

Vendor protocol numbers remain implementation evidence, not public API identifiers.

A model may expose several routes:

```text
marklife-x4
├── CUPS/Winspool → TSPL
├── USB           → TSPL candidate
└── SPP           → Marklife protocol 7 + JBIG

marklife-d210
├── CUPS/Winspool → ESC/POS GS v 0
├── USB           → ESC/POS candidate
└── SPP           → Marklife protocol 5
```

---

## 3.5.2 Capability-driven printer profiles

Do not branch the UI directly on model names.

```ts
interface PrinterCapabilities {
  dpi: number;

  printableArea: {
    maxWidthDots: number;
    maxHeightDots?: number;
  };

  media: {
    continuous: boolean;
    gap: boolean;
    blackMark: boolean;
    sheet?: boolean;
  };

  print: {
    copies: boolean;

    density?: {
      min: number;
      max: number;
      default: number;
    };

    speed?: {
      values: number[];
      default: number;
    };

    rotation: Array<0 | 90 | 180 | 270>;
    mirror?: boolean;
    negative?: boolean;
  };

  transports: {
    spooler?: boolean;
    cups?: boolean;
    usb?: boolean;
    bluetoothSpp?: boolean;
    bluetoothBle?: boolean;
    tcp?: boolean;
  };
}
```

Render only controls supported by the selected route.

---

## 3.5.3 Printer onboarding

Provide:

```text
Add Printer
├── System Printers
├── USB
├── Bluetooth
└── Network
```

Flow:

```text
discover
  ↓
match device profile
  ↓
show matching confidence
  ↓
resolve available routes
  ↓
user confirms profile if ambiguous
  ↓
test print
  ↓
save printer
```

Persist each printer independently:

```ts
interface SavedPrinter {
  id: string;
  displayName: string;

  deviceProfileId: string;
  selectedRouteId: string;

  connection: SavedConnection;

  calibration: {
    offsetXmm: number;
    offsetYmm: number;
  };

  preferredMediaProfileId?: string;
  preferredLabelPresetId?: string;
}
```

---

## 3.5.4 Multiple printers simultaneously

The application must support several saved printers at once.

Example:

```text
Warehouse
├── X4 — Shipping Labels
├── D210 — Product Labels
└── P50 — Shelf Labels
```

Users should be able to:

```text
select printer per job
set an application default printer
set a default printer per label preset
store calibration per printer
store density/media preferences per printer
```

Never store calibration globally.

---


# 3.5.5 Concrete model profiles: X4, D210, P50

X4, D210, and P50 must be first-class device profiles with **different settings schemas**.

Do not implement:

```ts
const settings = {
  density,
  speed,
  gap,
};
```

for every printer.

Instead:

```text
saved printer
    ↓
device profile
    ↓
selected route
    ↓
route capabilities
    ↓
model-specific settings schema
    ↓
settings UI generated from supported capabilities
```

The settings below are based on the supplied X4/D210 desktop drivers and the analyzed Marklife Android application.

---

## 3.5.5.1 Marklife X4

### Identity

```text
Model: X4
Resolution: 203 DPI
Desktop language: TSPL/TSC-style
Android Bluetooth route: Classic SPP
Android Bluetooth protocol: Marklife protocol 7
```

The Android-compatible Bluetooth route is **not raw TSPL**.

```text
X4 + system queue/CUPS → TSPL
X4 + USB              → TSPL candidate; verify physically
X4 + SPP              → Marklife protocol 7 + JBIG-compatible payload
X4 + BLE              → do not add canonically unless an X4 revision advertises it
```

### X4 print settings

Desktop-driver evidence:

```text
Density presets:
Light   = 6
Normal  = 10
Dark    = 14

Vendor default density:
10

ThermalBridge initial app default:
14

Print speed:
1 ... 8

Vendor/default speed:
4
```

Keep vendor and application defaults separate:

```ts
density: {
  vendorDefault: 10,
  appDefault: 14,

  presets: [
    { id: "light", value: 6 },
    { id: "normal", value: 10 },
    { id: "dark", value: 14 },
  ],
}
```

### X4 media modes

```text
Continuous
Label With Gap
Label With Marks / Black Mark
```

Default desktop-driver media:

```text
Label With Gap
```

Route configuration should support:

```ts
type X4Media =
  | { kind: "continuous" }
  | {
      kind: "gap";
      gapHeightMm: number;
      gapOffsetMm: number;
    }
  | {
      kind: "black-mark";
      markHeightMm: number;
      markOffsetMm: number;
    };
```

### X4 image-processing modes

The desktop driver exposes:

```text
None
Diffusion
Gathering
ErrorDiffusion
Default
```

ThermalBridge should map these to its independent raster algorithms rather than copy vendor code.

Recommended UI:

```text
Sharp / Barcode
Diffusion
Error Diffusion
Auto
```

Keep the raw compatibility mode names available in diagnostics.

### X4 geometry settings

```text
Horizontal offset: -20 ... +20 mm
Vertical offset:   -20 ... +20 mm

Rotation:
0°
90°
180°
270°

Mirror:
Off / On

Negative:
Off / On
```

### X4 save-paper switches

The PPD also exposes:

```text
Save Paper Up:   Off / On
Save Paper Down: Off / On
```

Keep these under an **Advanced** section until their physical behavior is verified.

### X4 common media presets

The desktop driver includes, among others:

```text
100 × 100 mm
100 × 120 mm
100 × 150 mm
100 × 170 mm
100 × 180 mm
100 × 200 mm
100 × 250 mm

2 × 1 in
2 × 4 in
3 × 2 in
3 × 3 in
3 × 5 in
4 × 1 in
4 × 2 in
4 × 2.5 in
4 × 3 in
4 × 4 in
4 × 5 in
4 × 6 in
4 × 6.5 in
4 × 13 in
```

Do not fill the normal preset selector with every PPD size.

Recommended built-ins shown by default:

```text
100 × 150 mm
4 × 6 in
100 × 100 mm
100 × 200 mm
50 × 100 mm
Custom
```

Additional verified X4 PPD formats can live under:

```text
More sizes…
```

### X4 Bluetooth compatibility setting

The protocol-7 pipeline contains an observed grayscale compatibility parameter:

```text
135
```

Keep it private to:

```text
marklife-x4-bt-v7
```

It must not become the global threshold slider.

Canonical route behavior:

```ts
{
  model: "marklife-x4",
  transport: "bluetooth-spp",
  protocol: "marklife-x4-bt-v7",
  codec: "jbig-t85",
  implementationStatus: "incomplete",
}
```

Until the protocol-7 header is reconstructed, normal X4 SPP printing should return a clear protocol-unimplemented state.

A separate raw-TSPL-over-SPP diagnostic route may exist only as explicit experimental hardware testing.

---

## 3.5.5.2 Marklife D210

D210 is substantially different from X4 and must have its own settings panel.

### Identity

```text
Model: D210
Resolution: 203 DPI
Desktop raster protocol: ESC/POS GS v 0
Android Bluetooth route: Classic SPP
Android protocol: Marklife protocol 5
```

The desktop raster filter emits:

```text
1D 76 30 00 xL xH yL yH
```

or:

```text
GS v 0
```

and sends raster data in blocks of up to:

```text
24 rows
```

So:

```text
D210 desktop != TSPL
D210 Bluetooth != generic ESC/POS
```

### D210 media types

The desktop driver exposes five media modes:

```text
0 — Continuous
1 — Label Paper
2 — Folded With Marks
3 — Tattoo Paper
4 — Label With Marks
```

Represent these explicitly:

```ts
type D210MediaType =
  | "continuous"
  | "label"
  | "folded-with-marks"
  | "tattoo"
  | "label-with-marks";
```

Do not translate these automatically into X4 GAP/BLINE commands.

The D210 protocol adapter owns their meaning.

### D210 label-location behavior

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

Expose only when a label/marked media type is selected.

### D210 darkness

The D210 desktop driver exposes:

```text
0
1
2
```

Vendor default:

```text
1
```

Use a D210-specific setting:

```ts
darkness: {
  min: 0,
  max: 2,
  default: 1,
}
```

Do **not** reuse X4 values `6/10/14`.

### D210 image processing

```text
None
Diffusion
Gathering
ErrorDiffusion
```

Default:

```text
None
```

Again, map this onto ThermalBridge's own raster algorithms.

### D210 feed controls

For continuous paper, the desktop driver supports independent feed distances:

```text
Document Begin
Page Begin
Page End
Document End
```

Each supports:

```text
0 ... 32 mm
```

Vendor defaults:

```text
Document Begin: 0 mm
Page Begin:     0 mm
Page End:       0 mm
Document End:  12 mm
```

These settings should appear only when:

```text
media.kind === "continuous"
```

Model them as:

```ts
interface D210FeedSettings {
  documentBeginMm: number; // 0..32
  pageBeginMm: number;     // 0..32
  pageEndMm: number;       // 0..32
  documentEndMm: number;   // 0..32, default 12
}
```

### D210 geometry

```text
Horizontal offset: -20 ... +20 mm
Vertical offset:   -20 ... +20 mm

Rotation:
0°
90°
180°
270°

Mirror:
Off / On

Negative:
Off / On
```

### D210 save-paper switches

```text
Save Paper Up
Save Paper Down
```

Default:

```text
Off
```

Keep these under Advanced until verified.

### D210 driver paper/document presets

The supplied desktop driver explicitly exposes:

```text
A4
A5
B5
Letter
Legal

2-inch roll
3-inch roll
4-inch roll
8-inch roll

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

This is why D210 must not be treated purely as a small product-label profile.

Group formats in the UI:

```text
Documents
Roll Paper
Labels / Photos
Custom
```

### D210 route-specific UI

D210 should **not** show:

```text
X4 speed 1..8
TSPL gap command values
TSPL density 6/10/14
```

unless a future D210 route independently proves those controls.

Example normal settings panel:

```text
Paper / Format
Media Type
Darkness 0–2
Locate Label
Image Processing
Copies
Rotation
Offsets

Advanced:
Feed controls
Mirror
Negative
Save Paper
```

---

## 3.5.5.3 Marklife P50

P50 is a third, distinct printer profile derived from the Android application.

### Identity and aliases

The application matches:

```text
P50
P5OS
PS50
P50S
```

to the P50 family.

Stable internal model:

```text
marklife-p50
```

Android protocol:

```text
3
```

Do not expose `3` as the public model ID.

### P50 physical capabilities

Observed application configuration:

```text
Resolution / accuracy: 203 DPI
Print-head readable width: 48 mm
Default label: 40 × 30 mm
Label creation: supported
Continuous labels: supported
Gap labels: supported
Dynamic MTU behavior: enabled in the newer device-style path
```

Important distinction:

```text
media width may reach 50 mm
effective printable head width is approximately 48 mm
```

Therefore the compatibility resolver should allow 50 mm physical stock while preserving printable margins.

Recommended:

```ts
hardware: {
  dpi: 203,

  mediaWidthMm: {
    max: 50,
  },

  printableWidthMm: 48,
}
```

Do not scale content to 50 mm of printable width.

### P50 default media configuration

Observed device configuration:

```text
Default paper type: 1
Continuous direction: 2
Default label size: 40 × 30 mm
Default portrait paper width: 50 mm
Default horizontal paper width: 50 mm
```

Keep numeric vendor values inside the P50 protocol compatibility layer until their exact semantic names are fully established.

The normal application UI should expose:

```text
Gap Label
Continuous Label
```

rather than raw paper-type integers.

### P50 density

`P50Protocol.getData()` maps the three application density levels as follows:

```text
Level 1 → protocol density 3
Level 2 → protocol density 10
Level 3 → protocol density 14
```

Therefore use:

```ts
density: {
  levels: [
    { level: 1, label: "Light",  protocolValue: 3 },
    { level: 2, label: "Normal", protocolValue: 10 },
    { level: 3, label: "Dark",   protocolValue: 14 },
  ],

  appDefaultLevel: 2,
}
```

`Level 2` is the recommended ThermalBridge default.

Do not reuse the X4 setting directly even though two resulting values overlap.

### P50 speed

The analyzed `P50Protocol.getData()` does not consume `ProtocolParams.getSpeed()`.

Therefore:

```text
do not show a P50 speed slider
```

unless another verified P50 route demonstrates speed control.

This is exactly why route-specific settings are required.

### P50 label presets from the Marklife app

The Android device model contains these label sizes:

```text
40 × 30 mm
20 × 10 mm
25 × 15 mm
30 × 15 mm
30 × 20 mm
40 × 20 mm
40 × 40 mm
40 × 60 mm
40 × 80 mm
45 × 75 mm
50 × 20 mm
50 × 30 mm
50 × 50 mm
50 × 70 mm
50 × 80 mm
```

These should become built-in P50-compatible presets.

Recommended default:

```text
40 × 30 mm
```

Recommended quick presets:

```text
40 × 30
50 × 30
50 × 20
40 × 20
30 × 20
Custom
```

Keep the rest under:

```text
More sizes…
```

### P50 device information/settings

The Android P50 attributes explicitly support:

```text
Battery voltage
Firmware version
Serial number
Shutdown time
```

`Shutdown time` is writable.

Add a device-information pane:

```text
Battery
Firmware
Serial number
Auto shutdown
```

Do not place this inside print-job settings.

Suggested API:

```ts
interface P50DeviceAttributes {
  batteryVoltage?: number;
  firmwareVersion?: string;
  serialNumber?: string;
  shutdownTime?: number;
}
```

and:

```ts
setShutdownTime(value): Promise<void>
```

only when the route/session supports it.

### P50 Bluetooth routing

The analyzed app clearly has P50-specific Bluetooth/protocol infrastructure and dynamic-MTU behavior.

Do not hard-code SPP or BLE from the model name alone.

For P50:

```text
discover actual advertised Bluetooth capability
    ↓
match P50 model
    ↓
resolve compatible P50 protocol-3 route
```

Until a physical P50 is captured and verified:

```text
transport: capability-detected
protocol: marklife-p50-v3
status: candidate
```

### P50 recommended settings panel

```text
Label Size
[ 40 × 30 mm ]

Paper
[ Gap Label / Continuous ]

Density
[ Light / Normal / Dark ]

Copies
[ 1 ]

Orientation
[ Auto / 0 / 90 / 180 / 270 ]

Fit
[ Fit / Fill ]

Advanced
[ calibration offsets ]
```

Do not show:

```text
X4 speed slider
D210 document feed controls
D210 tattoo/fold media types
X4 black-mark controls
```

unless independently verified for P50.

---

# 3.5.6 Settings must be scoped by model and route

Use route-specific settings types.

Example:

```ts
interface X4TsplSettings {
  density: 6 | 10 | 14;
  speed: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

  media:
    | { kind: "continuous" }
    | { kind: "gap"; heightMm: number; offsetMm: number }
    | { kind: "black-mark"; heightMm: number; offsetMm: number };

  processing:
    | "none"
    | "diffusion"
    | "gathering"
    | "error-diffusion"
    | "auto";

  offsetXmm: number;
  offsetYmm: number;

  rotation: 0 | 90 | 180 | 270;
  mirror: boolean;
  negative: boolean;
}
```

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

  feed?: D210FeedSettings;

  offsetXmm: number;
  offsetYmm: number;

  rotation: 0 | 90 | 180 | 270;
  mirror: boolean;
  negative: boolean;
}
```

```ts
interface P50Settings {
  densityLevel: 1 | 2 | 3;

  paper:
    | { kind: "gap" }
    | { kind: "continuous" };

  labelPresetId: string;

  copies: number;

  rotation: 0 | 90 | 180 | 270;
}
```

Then bind settings to a route:

```ts
type RouteSettings =
  | {
      routeId: "x4-os-tspl" | "x4-usb-tspl";
      settings: X4TsplSettings;
    }
  | {
      routeId: "d210-os-escpos" | "d210-usb-escpos";
      settings: D210DesktopSettings;
    }
  | {
      routeId: "p50-bt-v3";
      settings: P50Settings;
    };
```

Do not create one universal settings record full of optional fields.

---

# 3.5.7 Model-specific defaults

Persist defaults per saved printer.

Example:

```ts
interface SavedPrinterPreferences<TSettings> {
  printerId: string;
  routeId: string;

  settings: TSettings;

  calibration: {
    offsetXmm: number;
    offsetYmm: number;
  };

  preferredLabelPresetId?: string;
}
```

Recommended application defaults:

### X4

```text
Label:       100 × 150 mm
Media:       Gap
Density:     14 app default
Speed:       4
Processing:  Auto/Default
Rotation:    Auto in UI, protocol output resolved to concrete rotation
Offsets:     0 / 0
```

Remember:

```text
X4 vendor density default remains 10.
```

### D210

```text
Media:             Continuous unless source/preset selects label media
Darkness:          1
Processing:        None
Locate labels:     On when label media is used
Document begin:    0 mm
Page begin:        0 mm
Page end:          0 mm
Document end:      12 mm
Offsets:           0 / 0
```

### P50

```text
Label:       40 × 30 mm
Paper:       Gap Label
Density:     Level 2 / Normal / protocol value 10
Copies:      1
Offsets:     route calibration default 0 / 0
```

These are application defaults and should remain editable per saved printer.

---

# 3.6 Multi-label and media-format system

A label format is not a printer profile.

Use four separate concepts:

```text
DeviceProfile
MediaProfile
LabelPreset
Template/Layout
```

## 3.6.1 MediaProfile

Describes the physical stock loaded in the printer.

```ts
interface MediaProfile {
  id: string;
  name: string;

  widthMm: number;
  heightMm?: number;

  sensing:
    | { kind: "continuous" }
    | {
        kind: "gap";
        gapHeightMm: number;
        gapOffsetMm?: number;
      }
    | {
        kind: "black-mark";
        markHeightMm: number;
        markOffsetMm?: number;
      };

  orientation?: "portrait" | "landscape";
}
```

For continuous media, job length may determine `heightMm`.

---

## 3.6.2 LabelPreset

```ts
interface LabelPreset {
  id: string;
  name: string;

  widthMm: number;
  heightMm: number;

  defaultFitMode: "fit" | "fill" | "actual" | "stretch";
  defaultRotation: 0 | 90 | 180 | 270;

  category:
    | "shipping"
    | "product"
    | "barcode"
    | "address"
    | "shelf"
    | "receipt"
    | "custom";
}
```

Initial built-in presets:

```text
Shipping
├── 100 × 150 mm
├── 4 × 6 in
├── 100 × 100 mm
├── 100 × 200 mm
└── 100 × 250 mm

Product / Barcode
├── 50 × 30 mm
├── 50 × 25 mm
├── 40 × 30 mm
├── 40 × 20 mm
├── 30 × 20 mm
└── Custom

Address / General
├── 70 × 40 mm
├── 60 × 40 mm
└── Custom
```

These are application presets, not claims that every printer supports every size.

Filter them through hardware capabilities.

---

## 3.6.3 Custom sizes

Users must be able to save custom physical label sizes.

Validation:

```text
width > 0
height > 0
widthDots <= verified printer width
height fits route/printer constraints
requested sensing mode is supported
```

---

## 3.6.4 Printer/label compatibility resolver

Add a second resolver:

```text
Printer
   ↓
Route
   ↓
Capabilities
   ↓
MediaProfile
   ↓
LabelPreset
   ↓
Compatibility result
```

```ts
interface LabelCompatibilityResult {
  compatible: boolean;
  warnings: string[];
  errors: string[];

  resolved: {
    widthDots: number;
    heightDots: number;
  };
}
```

Examples:

```text
X4 + 100×150 gap label
→ compatible

small-format printer + 100×150 label
→ incompatible

printer without black-mark sensor + black-mark media
→ incompatible
```

Hard physical incompatibilities must not be bypassed silently.

---

## 3.6.5 Source file formats

Keep source format separate from physical label size.

MVP:

```text
PDF
PNG
JPEG
```

Next:

```text
SVG
WebP
clipboard image
```

Later:

```text
HTML
raw TSPL
raw ESC/POS
ZPL
CPCL
CSV batch data
JSON template data
```

Everything normalizes into the same print pipeline.

---

## 3.6.6 PDF physical-size detection

For PDFs:

```text
read page box
  ↓
points → mm
  ↓
compare against known presets
  ↓
suggest closest preset
```

Example:

```text
99–101 mm × 149–151 mm
→ suggest 100 × 150 mm
```

For images without trustworthy DPI metadata, do not infer physical dimensions from pixels alone.

---

## 3.6.7 Auto-rotation

Support:

```text
Auto
0°
90°
180°
270°
```

Auto selects the orientation with the best fit without distortion.

---

## 3.6.8 Reusable templates

Later:

```text
Product Label
├── product name
├── SKU
├── barcode
├── price
└── logo
```

Recommended pipeline:

```text
template
  ↓
Canvas/SVG
  ↓
raster
  ↓
selected printer protocol
```

This keeps templates portable across printer families.

---

## 3.6.9 Mixed batch jobs

```ts
interface BatchPrintJob {
  items: Array<{
    source: PrintSource;
    printerId: string;
    labelPresetId: string;
    copies: number;
  }>;
}
```

Example:

```text
Order
├── X4   → 100×150 shipping label
├── D210 → 50×30 product label ×2
└── another printer → another format
```

Batch orchestration belongs above protocol encoding.

---

# 3.7 UI for multiple printers and formats

Recommended print pane:

```text
Printer
[ X4 — Shipping Station ▼ ]

Connection
[ System Queue / USB / Bluetooth SPP ]

Label format
[ 100 × 150 mm — Shipping ▼ ]

Media
[ Gap ▼ ]

Orientation
[ Auto ▼ ]

Fit
[ Fit ▼ ]

Copies
[ 1 ]

Printer settings
Density [ 14 ]   ← route-specific
Speed   [ 4 ]    ← only when supported
Gap     [ 2 mm ] ← only when relevant

[ Print ]
```

Normal users should see model/connection/status, not internal protocol IDs.

Diagnostics may show:

```text
device profile
route
protocol
codec
transport
session
```

---

# 3.8 Compatibility matrix

Generate this from the device registry.

| Printer | Queue | USB | SPP | BLE | Main protocol family | Status |
|---|---:|---:|---:|---:|---|---|
| X4 | Yes | Candidate | Yes | revision-dependent | TSPL / Marklife v7 | active |
| D210 | Yes | Candidate | Yes | revision-dependent | ESC/POS / Marklife v5 | planned |
| S8 | TBD | TBD | TBD | TBD | Marklife v1 | roadmap |
| S2 | TBD | TBD | TBD | TBD | Marklife v2 | roadmap |
| P50 | TBD | TBD | capability-detect | capability-detect | Marklife v3 | concrete profile / route verification pending |
| P12 | TBD | TBD | TBD | TBD | Marklife v4 | roadmap |
| P15 | TBD | TBD | TBD | TBD | Marklife v6 | roadmap |
| X2 BLE | TBD | TBD | TBD | Candidate | Marklife v8 | roadmap |
| X2 | TBD | TBD | TBD | TBD | Marklife v9 | roadmap |
| X8 | TBD | TBD | TBD | TBD | Marklife v10 | roadmap |
| R15 | TBD | TBD | TBD | TBD | Marklife v11 | roadmap |
| D100 | TBD | TBD | TBD | TBD | Marklife v12 | roadmap |
| U4 | TBD | TBD | TBD | TBD | Marklife v13 | roadmap |
| AiPrint | TBD | TBD | TBD | TBD | Marklife v14 | roadmap |

`TBD`, `candidate`, and `verified` must remain explicit.

Presence in the Android app is not sufficient to claim desktop compatibility.

---

# 4. Non-goals for the first release

Do **not** make these MVP blockers:

- implementing a Windows kernel-mode printer driver;
- replacing USB device drivers;
- firmware flashing;
- reverse engineering undocumented status protocols before printing works;
- requiring direct USB/Bluetooth support before the OS-spooler proof of concept is validated;
- cloud accounts;
- user registration;
- telemetry;
- auto-update;
- label design/editor comparable to Canva;
- OCR;
- automatic eMAG/DHL/Sameday extraction;
- arbitrary printer-language emulation.

Get reliable local printing working first.

---

# 5. Clean-room implementation policy

This project should be implemented as an independent compatibility layer.

## Rules

1. Do not distribute any supplied Marklife/YXQPOR installer.
2. Do not bundle the vendor `rastertoX4` executable.
3. Do not bundle vendor DLLs, APK native libraries, `libjbigkit.so`, `libCode.so`, or other vendor SDK binaries unless explicit redistribution rights and license compatibility are established.
4. Do not copy disassembled vendor code.
5. Do not reproduce proprietary assets or branding except where nominative compatibility naming is appropriate.
6. Implement behavior from observable inputs/outputs, protocol framing, documented standards, and independently written algorithms.
7. Keep notes describing externally observable protocol behavior.
8. Keep protocol tests based on our own expected byte streams.

Suggested public wording later:

> Compatible with Marklife X4. Not affiliated with or endorsed by Marklife.

Have final product naming and legal wording reviewed before commercial release.

---

# 6. Recommended technology stack

## Desktop

```text
Electron
React
TypeScript
Vite
```

Recommended Electron setup:

```text
electron-vite
```

Alternative:

```text
Vite + custom Electron main/preload configuration
```

Use one approach consistently.

## Package manager

```text
pnpm
```

## Monorepo

Use pnpm workspaces.

Turborepo is optional. Use it only if it materially improves build orchestration.

## Validation

```text
zod
```

## Unit tests

```text
Vitest
```

## Electron E2E

```text
Playwright
```

## Native bridge

```text
Rust
```

Recommended Rust responsibilities:

- enumerate installed printers;
- submit RAW print jobs on Windows;
- submit RAW print jobs through CUPS on Linux/macOS;
- query basic queue state where available;
- TCP/9100 transport;
- direct USB transport;
- Bluetooth transport supporting both BLE and Bluetooth Classic SPP;
- BLE service discovery, notification subscription, MTU negotiation, and flow-control/session primitives;
- SPP/RFCOMM byte-stream sessions;
- return platform diagnostics.

Avoid implementing rendering or TSPL in Rust unless profiling later proves it necessary.

## Packaging

Recommended:

```text
electron-builder
```

Targets:

```text
Windows: NSIS
macOS: DMG + ZIP
Linux: AppImage + DEB
```

MSI may be added later if enterprise deployment requires it.

---

# 7. Repository structure

Cursor should create this structure early.

```text
thermalbridge/
├── apps/
│   └── desktop/
│       ├── src/
│       │   ├── main/
│       │   │   ├── index.ts
│       │   │   ├── ipc/
│       │   │   ├── printing/
│       │   │   │   ├── print-orchestrator.ts
│       │   │   │   └── route-executor.ts
│       │   │   ├── bridge/
│       │   │   ├── settings/
│       │   │   └── diagnostics/
│       │   │
│       │   ├── preload/
│       │   │   ├── index.ts
│       │   │   └── api.ts
│       │   │
│       │   └── renderer/
│       │       ├── app/
│       │       ├── components/
│       │       ├── features/
│       │       │   ├── import/
│       │       │   ├── preview/
│       │       │   ├── printers/
│       │       │   ├── connections/
│       │       │   ├── print-settings/
│       │       │   ├── calibration/
│       │       │   └── diagnostics/
│       │       ├── hooks/
│       │       ├── state/
│       │       └── workers/
│       │
│       ├── resources/
│       ├── electron-builder.yml
│       └── package.json
│
├── packages/
│   ├── thermal-core/
│   │   ├── src/
│   │   │   ├── bitmap/
│   │   │   │   ├── grayscale.ts
│   │   │   │   ├── threshold.ts
│   │   │   │   ├── floyd-steinberg.ts
│   │   │   │   ├── ordered-dither.ts
│   │   │   │   ├── rotate.ts
│   │   │   │   ├── mirror.ts
│   │   │   │   ├── negative.ts
│   │   │   │   ├── resize.ts
│   │   │   │   └── pack-bits.ts
│   │   │   ├── geometry/
│   │   │   │   ├── units.ts
│   │   │   │   ├── fit.ts
│   │   │   │   └── crop.ts
│   │   │   ├── jobs/
│   │   │   │   └── raster-job.ts
│   │   │   └── index.ts
│   │   └── test/
│   │
│   ├── bitmap-codecs/
│   │   ├── src/
│   │   │   ├── raw-mono/
│   │   │   ├── jbig-t85/
│   │   │   ├── marklife-d210/
│   │   │   ├── codec.ts
│   │   │   └── index.ts
│   │   └── test/
│   │
│   ├── printer-protocols/
│   │   ├── src/
│   │   │   ├── binary-writer.ts
│   │   │   ├── protocol.ts
│   │   │   ├── tspl/
│   │   │   │   ├── commands.ts
│   │   │   │   ├── encoder.ts
│   │   │   │   └── job-builder.ts
│   │   │   ├── esc-pos/
│   │   │   │   ├── encoder.ts
│   │   │   │   └── raster.ts
│   │   │   └── marklife/
│   │   │       ├── common/
│   │   │       ├── x4-bluetooth/
│   │   │       │   ├── header.ts
│   │   │       │   ├── encoder.ts
│   │   │       │   └── types.ts
│   │   │       ├── d210-bluetooth/
│   │   │       │   ├── commands.ts
│   │   │       │   ├── encoder.ts
│   │   │       │   └── types.ts
│   │   │       └── p50/
│   │   │           ├── commands.ts
│   │   │           ├── encoder.ts
│   │   │           └── types.ts
│   │   └── test/
│   │
│   ├── device-registry/
│   │   ├── src/
│   │   │   ├── schema.ts
│   │   │   ├── route-resolver.ts
│   │   │   ├── device-matcher.ts
│   │   │   ├── bluetooth-profiles.ts
│   │   │   ├── models/
│   │   │   │   ├── marklife-x4.ts
│   │   │   │   ├── marklife-d210.ts
│   │   │   │   ├── marklife-p50.ts
│   │   │   │   └── generic.ts
│   │   │   └── index.ts
│   │   └── test/
│   │
│   ├── media-profiles/
│   │   ├── src/
│   │   │   ├── schema.ts
│   │   │   ├── built-in.ts
│   │   │   ├── compatibility.ts
│   │   │   └── index.ts
│   │   └── test/
│   │
│   ├── label-presets/
│   │   ├── src/
│   │   │   ├── schema.ts
│   │   │   ├── built-in.ts
│   │   │   ├── auto-detect.ts
│   │   │   └── index.ts
│   │   └── test/
│   │
│   ├── print-pipeline/
│   │   ├── src/
│   │   │   ├── resolve-route.ts
│   │   │   ├── resolve-label-format.ts
│   │   │   ├── encode-job.ts
│   │   │   └── types.ts
│   │   └── test/
│   │
│   ├── shared/
│   │   ├── src/
│   │   │   ├── ipc.ts
│   │   │   ├── printer.ts
│   │   │   ├── connection.ts
│   │   │   ├── settings.ts
│   │   │   └── errors.ts
│   │   └── package.json
│   │
│   └── test-fixtures/
│       ├── images/
│       ├── pdf/
│       ├── expected/
│       │   ├── tspl/
│       │   ├── esc-pos/
│       │   ├── x4-bluetooth/
│       │   └── d210-bluetooth/
│       └── README.md
│
├── native/
│   └── printbridge/
│       ├── Cargo.toml
│       └── src/
│           ├── main.rs
│           ├── protocol.rs
│           ├── devices.rs
│           ├── sessions/
│           │   ├── mod.rs
│           │   ├── ble_marklife.rs
│           │   └── spp.rs
│           ├── transport/
│           │   ├── mod.rs
│           │   ├── windows.rs
│           │   ├── cups.rs
│           │   ├── tcp.rs
│           │   ├── usb.rs
│           │   ├── bluetooth_ble.rs
│           │   └── bluetooth_spp.rs
│           └── errors.rs
│
├── docs/
│   ├── architecture.md
│   ├── device-route-matrix.md
│   ├── protocol-tspl.md
│   ├── protocol-esc-pos.md
│   ├── protocol-marklife-x4-bluetooth.md
│   ├── protocol-marklife-d210-bluetooth.md
│   ├── hardware-transports.md
│   ├── android-app-findings.md
│   ├── reverse-engineering-notes.md
│   ├── packaging.md
│   ├── testing.md
│   └── troubleshooting.md
│
├── scripts/
│   ├── build-printbridge.mjs
│   ├── copy-printbridge.mjs
│   └── verify-package.mjs
│
├── .github/
│   └── workflows/
│       ├── test.yml
│       └── release.yml
│
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── eslint.config.js
├── prettier.config.mjs
├── .editorconfig
├── .gitignore
├── LICENSE
└── README.md
```

### Package-boundary rule

The dependency direction should be:

```text
thermal-core
    ↓
bitmap-codecs
    ↓
printer-protocols
    ↓
device-registry
    ↓
print-pipeline
    ↓
Electron main orchestration
    ↓
printbridge transport/session
```

Avoid circular dependencies.

A protocol encoder must not import Electron, Rust bindings, CUPS, Winspool, Web Bluetooth, or UI code.

---

# 8. High-level runtime architecture

```text
┌─────────────────────────────────────────────────────────┐
│ Electron Renderer                                       │
│ React UI / PDF.js / Canvas                              │
└─────────────────────────┬───────────────────────────────┘
                          │ typed preload API
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Electron Main                                           │
│ validation / orchestration / temp jobs / settings       │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Document + Raster Layer                                 │
│ PDF/image → exact-size RGBA → mono/gray raster          │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Device Registry + Route Resolver                        │
│ model + transport + capabilities → route                │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│ Codec Layer                                             │
│ raw 1-bpp / JBIG-compatible / D210-compatible codec     │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Protocol Layer                                          │
│ TSPL / ESC-POS / X4 BT v7 / D210 BT v5 / future        │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ printbridge (Rust)                                      │
│                                                         │
│ Session:                                                │
│   BLE Marklife flow control / SPP session               │
│                                                         │
│ Transport:                                              │
│   Winspool / CUPS / TCP / USB / BLE / SPP               │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
                    Thermal printer
```

## 8.1 Why protocol and transport must be separate

The Android app proves these are different concerns.

Bad design:

```ts
if (printer.model === "X4") {
  return encodeTspl(job);
}
```

Correct design:

```ts
const route = routeResolver.resolve({
  device,
  connection,
  capabilities,
});

const encoded = protocolPipeline.encode({
  route,
  rasterJob,
});

await transportManager.send({
  route,
  bytes: encoded,
});
```

A printer model can expose several valid routes.

---

## 8.2 Route model

Use a route contract similar to:

```ts
export type TransportKind =
  | "windows-spooler"
  | "cups"
  | "tcp"
  | "usb"
  | "bluetooth-spp"
  | "bluetooth-ble";

export type ProtocolId =
  | "tspl"
  | "esc-pos"
  | "marklife-x4-bt-v7"
  | "marklife-d210-bt-v5";

export type CodecId =
  | "raw-mono-1bpp"
  | "jbig-t85"
  | "marklife-d210";

export type SessionProfileId =
  | "none"
  | "raw-stream"
  | "marklife-spp"
  | "marklife-ble-credit";

export interface PrinterRoute {
  id: string;
  modelId: string;

  transport: TransportKind;
  protocol: ProtocolId;
  codec: CodecId;
  session: SessionProfileId;

  status: "verified" | "candidate" | "experimental";

  constraints?: {
    maxPacketBytes?: number;
    requiresNotifications?: boolean;
    requiresPairing?: boolean;
  };
}
```

The route resolver should never silently choose an experimental route when a verified route exists.

---

## 8.3 Initial route matrix

| Model | Transport | Protocol | Codec | Status |
|---|---|---|---|---|
| X4 | OS queue | TSPL-style | raw mono | desktop-driver evidence |
| X4 | direct USB | TSPL-style candidate | raw mono | physical verification required |
| X4 | Bluetooth SPP | Marklife X4 BT v7 | JBIG-compatible | Android routing evidence; physical verification required |
| X4 | BLE | Marklife X4 BT v7 only if advertised/verified | JBIG-compatible | capability-dependent; do not assume |
| D210 | OS queue | ESC/POS `GS v 0` raster | raw mono | desktop-driver evidence |
| D210 | direct USB | ESC/POS `GS v 0` candidate | raw mono | physical verification required |
| D210 | Bluetooth SPP | Marklife D210 BT v5 | D210 codec | Android routing evidence; physical verification required |
| D210 | BLE | Marklife D210 BT v5 if advertised/verified | D210 codec | capability-dependent; do not assume |

This matrix belongs in code and documentation.

---

# 9. Electron security requirements

Treat these as mandatory.

```ts
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  preload: preloadPath
}
```

Renderer code must never receive unrestricted Node.js access.

Expose a small typed preload surface such as:

```ts
interface ThermalBridgeAPI {
  printers: {
    list(): Promise<PrinterInfo[]>;
    refresh(): Promise<PrinterInfo[]>;
  };

  print: {
    submit(request: PrintRequest): Promise<PrintResult>;
    testPage(request: TestPrintRequest): Promise<PrintResult>;
  };

  settings: {
    get(): Promise<AppSettings>;
    update(patch: AppSettingsPatch): Promise<AppSettings>;
  };

  diagnostics: {
    getSystemInfo(): Promise<SystemDiagnostics>;
    exportBundle(): Promise<string>;
  };
}
```

All IPC payloads must be validated with Zod in the main process.

Do not expose:

```text
shell.exec
arbitrary filesystem reads
arbitrary filesystem writes
child_process
raw native bridge commands
```

to the renderer.

---

# 10. Data flow for a print job

The target pipeline is:

```text
input file
   ↓
decode/render
   ↓
select page
   ↓
crop / rotate / fit
   ↓
render exact printer pixel dimensions
   ↓
grayscale / threshold / dither as required
   ↓
resolve device + transport route
   ↓
route-specific bitmap codec
   ↓
route-specific protocol encoder
   ↓
session framing / BLE flow control if required
   ↓
transport
   ↓
printer
```

Examples:

```text
X4 + Windows queue:
RGBA → mono → TSPL → Winspool RAW
```

```text
X4 + BLE:
RGBA → X4 grayscale representation → JBIG-compatible codec
     → X4 protocol v7 framing → Marklife BLE credit session → GATT
```

```text
D210 + Bluetooth SPP:
RGBA → D210 image processing/codec
     → D210 protocol v5 commands → SPP stream
```

The rendered preview and the actual encoded output must derive from the same geometry/transform model.

Do not maintain separate UI-only and print-only geometry code.

---

# 11. Measurement and DPI rules

Use millimetres as the canonical physical unit.

Helpers:

```ts
export function mmToDots(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi);
}

export function dotsToMm(dots: number, dpi: number): number {
  return (dots / dpi) * 25.4;
}
```

For 203 DPI:

```text
100 mm ≈ 799 dots
150 mm ≈ 1199 dots
4 in × 6 in ≈ 812 × 1218 dots
```

Do not assume all "4-inch" printers expose exactly 812 printable dots.

Device hardware profiles should be able to override maximum printable width independently of the protocol route.

Example:

```ts
interface DeviceHardwareCapabilities {
  dpi: number;

  maxPrintableWidthDots?: number;

  supportedPhysicalMedia?: Array<
    "continuous" | "gap" | "black-mark" | "sheet"
  >;

  offsets?: {
    minXmm: number;
    maxXmm: number;
    minYmm: number;
    maxYmm: number;
  };
}
```

Protocol-specific density, speed, feed, and media commands belong on the relevant route/protocol configuration rather than in one universal `language` property.

---

# 12. Device registry and route profiles

The original single-language X4 profile is no longer sufficient.

A device profile describes physical/default capabilities. A route profile describes how that device is reached through a particular transport.

## 12.1 Device profile

```ts
interface DeviceProfile {
  id: string;
  manufacturer: string;
  model: string;

  matchers: {
    printerQueueNames?: RegExp[];
    bluetoothNames?: RegExp[];
    ieee1284?: RegExp[];
    usbIds?: Array<{ vid: number; pid: number }>;
  };

  hardware: {
    dpi: number;
    maxPrintableWidthDots?: number;
  };

  density?: {
    min: number;
    max: number;
    default: number;
  };

  mediaModes: Array<"continuous" | "gap" | "black-mark">;

  routes: PrinterRoute[];
}
```

---

## 12.2 Marklife X4

Known base values:

```text
Resolution: 203 DPI
Density presets observed: 6 / 10 / 14
Default density: 10
Speed observed: 1 ... 8
Default speed: 4
Media: continuous / gap / black mark
```

Example route declaration:

```ts
export const MARKLIFE_X4: DeviceProfile = {
  id: "marklife-x4",
  manufacturer: "Marklife",
  model: "X4",

  matchers: {
    printerQueueNames: [/Marklife.*X4/i],
    bluetoothNames: [/^X4/i],
  },

  hardware: {
    dpi: 203,
  },

  density: {
    min: 0,
    max: 15,
    default: 10,
  },

  mediaModes: ["continuous", "gap", "black-mark"],

  routes: [
    {
      id: "x4-os-tspl",
      modelId: "marklife-x4",
      transport: "cups",
      protocol: "tspl",
      codec: "raw-mono-1bpp",
      session: "raw-stream",
      status: "candidate",
    },
    {
      id: "x4-spp-v7",
      modelId: "marklife-x4",
      transport: "bluetooth-spp",
      protocol: "marklife-x4-bt-v7",
      codec: "jbig-t85",
      session: "marklife-spp",
      status: "candidate",
      constraints: {
        requiresPairing: true,
      },
    },

    // Add an X4 BLE route only if a physical X4 revision advertises
    // a compatible BLE service and the protocol is verified there.

  ],
};
```

Do not mark direct USB or Bluetooth routes `verified` until hardware tests succeed.

---

## 12.3 Marklife D210 future profile

D210 is the next planned model after X4.

Known evidence:

```text
Desktop driver: BitmapPrintCmdPOS
Desktop raster opcode: GS v 0 / 1D 76 30 00
Desktop raster chunking: up to 24 rows per command
Resolution: 203 DPI
Android protocol ID: 5
Android model configuration favors classic Bluetooth for D210
Android SDK contains D210-specific battery/session commands
```

Initial route design:

```ts
export const MARKLIFE_D210: DeviceProfile = {
  id: "marklife-d210",
  manufacturer: "Marklife",
  model: "D210",

  matchers: {
    printerQueueNames: [/D210/i],
    bluetoothNames: [/^D210/i, /^210/i],
  },

  hardware: {
    dpi: 203,
  },

  mediaModes: ["continuous", "gap"],

  routes: [
    {
      id: "d210-os-pos",
      modelId: "marklife-d210",
      transport: "cups",
      protocol: "esc-pos",
      codec: "raw-mono-1bpp",
      session: "raw-stream",
      status: "candidate",
    },
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
    },
  ],
};
```

The exact D210 raster width, POS command subset, density mapping, Bluetooth framing, and codec must be verified before release.

---

## 12.4 Model aliases

Do not implement model detection as scattered `startsWith()` checks.

Maintain aliases centrally:

```ts
interface ModelAlias {
  matcher: RegExp;
  modelId: string;
  confidence: "exact" | "probable";
}
```

The Android app contains many device-name branches and OEM aliases. Reproduce only the aliases needed for verified compatibility, with tests.

---

# 13. Raster engine

The raster engine must be pure TypeScript.

It should accept an RGBA buffer:

```ts
interface RgbaImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}
```

and return a monochrome representation:

```ts
interface MonoBitmap {
  width: number;
  height: number;
  bytesPerRow: number;
  data: Uint8Array;
}
```

---

## 13.1 Grayscale

Implement deterministic grayscale conversion.

A sensible starting point:

```ts
Y = round(0.2126 * R + 0.7152 * G + 0.0722 * B)
```

Alpha should composite against white before grayscale conversion.

Do not treat transparent pixels as black.

---

## 13.2 Threshold mode

Implement:

```ts
black = grayscale < threshold
```

Default:

```text
threshold = 128
```

Expose:

```text
0 ... 255
```

to advanced users.

Threshold mode should be recommended for:

- QR codes;
- barcodes;
- mostly-black text;
- already-binary shipping labels.

---

## 13.3 Error diffusion

Implement Floyd-Steinberg first.

Pseudocode:

```text
for each pixel left-to-right:
    old = value
    new = old < threshold ? 0 : 255
    error = old - new

    distribute error:
        right        += error * 7/16
        bottom-left  += error * 3/16
        bottom       += error * 5/16
        bottom-right += error * 1/16
```

Use floating-point or fixed-point work buffers, but keep deterministic tests.

Later add:

```text
Atkinson
ordered Bayer
adaptive threshold
```

Do not make advanced dithering an MVP requirement.

---

## 13.4 Bit packing

The initial expected TSPL bitmap representation is row-major 1-bit packed data.

Start with MSB-first packing:

```ts
export function packBits(
  blackPixels: Uint8Array,
  width: number,
  height: number,
): MonoBitmap {
  const bytesPerRow = Math.ceil(width / 8);
  const data = new Uint8Array(bytesPerRow * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const black = blackPixels[y * width + x] !== 0;

      if (!black) continue;

      const byteIndex = y * bytesPerRow + (x >> 3);
      const bit = 7 - (x & 7);

      data[byteIndex] |= 1 << bit;
    }
  }

  return {
    width,
    height,
    bytesPerRow,
    data,
  };
}
```

### Important

The first physical-printer test must verify:

- MSB-first versus LSB-first;
- whether `1` means black or white;
- row padding;
- exact BITMAP mode value.

Keep these assumptions centralized:

```ts
interface BitmapEncoding {
  bitOrder: "msb-first" | "lsb-first";
  blackBit: 0 | 1;
  rowAlignmentBytes: number;
  tsplMode: number;
}
```

Do not scatter them throughout the codebase.

---

# 14. Printer protocol encoders

Create an encoder that treats text commands and binary bitmap data separately.

Do **not** build binary jobs by concatenating JavaScript strings.

Example API:

```ts
const job = new TsplJobBuilder(profile);

job
  .sizeMm(100, 150)
  .gapMm(2, 0)
  .reference(0, 0)
  .density(10)
  .speed(4)
  .direction(0, 0)
  .clear()
  .bitmap({
    x: 0,
    y: 0,
    widthBytes: bitmap.bytesPerRow,
    height: bitmap.height,
    mode: 1,
    data: bitmap.data,
  })
  .print({
    sets: 1,
    copies: 1,
  });

const bytes = job.encode();
```

---

## 14.1 TSPL core commands

Implement at minimum:

```text
SIZE
GAP
BLINE
REFERENCE
OFFSET
DENSITY
SPEED
DIRECTION
CLS
BITMAP
PRINT
```

Potential additional commands should be added only when needed.

---

## 14.2 Binary-safe encoder

Implement an internal chunk collector:

```ts
type Chunk = Uint8Array;

class BinaryWriter {
  private chunks: Chunk[] = [];

  text(value: string): this;
  bytes(value: Uint8Array): this;
  concat(): Uint8Array;
}
```

Example BITMAP output:

```text
BITMAP 0,0,100,1200,1,
<120000 bytes of binary raster data>
\r\n
PRINT 1,1
```

The binary payload must never pass through UTF-8 decoding/encoding.

---

## 14.3 ESC/POS / POS raster adapter

Implement a separate ESC/POS raster adapter for D210 desktop compatibility.

The supplied D210 desktop filter specifically uses:

```text
GS v 0
1D 76 30 00 xL xH yL yH
```

and chunks raster output into blocks of at most **24 rows**.

Do not pretend that all POS-family printers accept identical ESC/POS raster behavior.

Initial interface:

```ts
interface EscPosRasterOptions {
  widthDots: number;
  heightDots: number;
  data: Uint8Array;
  density?: number;
  feedAfterPrint?: number;
}
```

Implement the verified `GS v 0` framing and 24-row compatibility chunking first, then validate bit polarity, printable width, feed behavior, and direct-USB acceptance on physical hardware.

Keep generic ESC/POS helpers separate from D210-specific quirks.

---

## 14.4 Marklife X4 Bluetooth protocol v7

Create a dedicated encoder:

```text
printer-protocols/marklife/x4-bluetooth
```

Expected high-level stages based on Android behavior:

```text
prepared bitmap
    ↓
X4 grayscale byte conversion
    ↓
JBIG-compatible encodeV2 equivalent
    ↓
X4 binary header
    ↓
payload/framing
```

Requirements:

- reproduce the byte format independently;
- create golden vectors from controlled synthetic images;
- document every known header field;
- leave unknown bytes named `unknownXX` until proven;
- do not infer semantics merely from position;
- separate JBIG encoding from X4 framing;
- do not ship the vendor's Android `.so`.

Suggested interfaces:

```ts
interface X4BluetoothHeaderInput {
  width: number;
  height: number;
  paperType: number;
  density: number;
  copies: number;
  payloadLength: number;
}

interface X4BluetoothEncoder {
  encode(
    raster: RasterJob,
    options: X4BluetoothOptions,
  ): Promise<Uint8Array>;
}
```

The Android code's observed grayscale parameter around `135` should become an explicitly tested compatibility parameter, not a magic number hidden in rendering code.

---

## 14.5 Marklife D210 Bluetooth protocol v5

Create a dedicated encoder:

```text
printer-protocols/marklife/d210-bluetooth
```

Observed command-building concepts include:

```text
paper type
density gear
density
wake
enable printer
bitmap
print-line dots
stop
return paper
location / movement
```

Treat the codec invoked by the Android path as its own component:

```text
bitmap-codecs/marklife-d210
```

Do not mix transport packetization into the D210 encoder.

The D210 protocol encoder should output one logical printer byte stream. SPP/BLE sessions then transmit that stream.

---

## 14.6 Protocol interface

Every protocol adapter should satisfy one conceptual contract:

```ts
export interface PrinterProtocolEncoder<
  TRoute extends PrinterRoute = PrinterRoute,
> {
  readonly protocolId: TRoute["protocol"];

  encode(input: {
    raster: RasterJob;
    route: TRoute;
    options: PrintOptions;
  }): Promise<Uint8Array>;
}
```

Protocol encoders must not know whether the eventual bytes travel through:

```text
CUPS
Winspool
USB
SPP
BLE
TCP
```

unless transport-specific framing is truly part of the observed printer protocol. In that case, model it as a route/session constraint rather than accessing the transport directly.

---


# 15. Media command behavior

Map media mode in one function.

```ts
function encodeMedia(settings: MediaSettings): string {
  switch (settings.mode) {
    case "continuous":
      return "GAP 0,0";

    case "gap":
      return `GAP ${settings.gapHeightMm} mm,${settings.gapOffsetMm} mm`;

    case "black-mark":
      return `BLINE ${settings.markHeightMm} mm,${settings.markOffsetMm} mm`;
  }
}
```

Validate all values.

Never insert untrusted strings directly into TSPL commands.

---

# 16. PDF and image rendering

## Renderer strategy

Use the Electron renderer process for document rasterization initially.

Advantages:

- Chromium already provides Canvas APIs;
- image decoding is mature;
- PDF.js can render to a controlled canvas;
- avoids a heavy native rendering dependency;
- preview and print can use the same geometry model.

Recommended:

```text
pdfjs-dist
Canvas / OffscreenCanvas
createImageBitmap
ImageData
```

Do not depend on Electron's built-in print dialog for raster generation.

---

## 16.1 PDF

For PDF input:

1. load using PDF.js;
2. show page thumbnails when document has multiple pages;
3. render selected page at sufficient resolution;
4. apply label transform;
5. render final print canvas at exact target dot dimensions;
6. extract `ImageData`.

Avoid rendering low-resolution preview pixels and then scaling them for printing.

The final raster should be generated directly at target resolution.

---

## 16.2 Image files

For PNG/JPEG:

1. decode via browser image APIs;
2. preserve source aspect ratio;
3. apply EXIF orientation if needed;
4. crop/fit;
5. render onto white background;
6. rasterize at final target dots.

---

# 17. Fit modes

Support:

```text
Fit
Fill
Actual size
Stretch
```

Recommended default:

```text
Fit
```

Definitions:

### Fit

Preserve aspect ratio and ensure entire source is visible.

### Fill

Preserve aspect ratio and crop overflow.

### Actual size

Use source physical dimensions when reliably available.

### Stretch

Force source to target dimensions.

Warn users that Stretch can distort barcodes.

---

# 18. Transform model

Use one immutable transform object.

```ts
interface LabelTransform {
  rotation: 0 | 90 | 180 | 270;
  mirrorX: boolean;
  mirrorY: boolean;
  negative: boolean;

  offsetXmm: number;
  offsetYmm: number;

  fitMode: "fit" | "fill" | "actual" | "stretch";

  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
```

Preview and print must use exactly the same transform state.

---

# 19. Rust printbridge

The native sidecar isolates platform-specific printing, direct-device access, Bluetooth session mechanics, and OS permissions.

Do not build it as a Node native addon for MVP.

The Rust bridge must remain **protocol-agnostic** where possible. It transports byte streams and implements connection/session behavior such as BLE credits; it should not generate X4/D210 print commands.

Compile it as a normal executable.

Example packaged names:

```text
printbridge-win-x64.exe
printbridge-macos-arm64
printbridge-macos-x64
printbridge-linux-x64
```

Electron main launches the packaged executable with controlled arguments.

---

## 19.1 IPC protocol with printbridge

Use persistent NDJSON over stdin/stdout.

Each line is one JSON message.

Request:

```json
{
  "id": "req_123",
  "method": "printers.list",
  "params": {}
}
```

Response:

```json
{
  "id": "req_123",
  "ok": true,
  "result": []
}
```

Error:

```json
{
  "id": "req_123",
  "ok": false,
  "error": {
    "code": "PRINTER_NOT_FOUND",
    "message": "Printer not found"
  }
}
```

For large print payloads, do not Base64 megabytes through NDJSON.

Electron should:

1. write the final `.prn` bytes to an app-controlled temporary directory;
2. pass that exact file path to printbridge;
3. printbridge reads it;
4. Electron removes it after completion.

Example:

```json
{
  "id": "req_456",
  "method": "printer.printRawFile",
  "params": {
    "printerId": "system-printer-id",
    "filePath": "/validated/app/temp/job-123.prn",
    "jobName": "Shipping label"
  }
}
```

The Rust bridge must reject paths outside the configured temp/job directory unless explicitly operating in development mode.

---

# 20. Windows printing backend

Use the Windows print spooler API.

Target flow:

```text
OpenPrinterW
StartDocPrinterW
StartPagePrinter
WritePrinter
EndPagePrinter
EndDocPrinter
ClosePrinter
```

Use a RAW document datatype.

Conceptually:

```text
DOC_INFO_1
  pDocName  = "ThermalBridge Label"
  pOutputFile = null
  pDatatype = "RAW"
```

Then call `WritePrinter` with the exact TSPL byte buffer.

Printer enumeration should use appropriate Windows spooler enumeration APIs.

Return a normalized structure:

```ts
interface PrinterInfo {
  id: string;
  name: string;
  systemName: string;
  isDefault: boolean;
  status: PrinterStatus;
  backend: "windows-spooler";
}
```

Do not parse localized Windows status strings in TypeScript.

Normalize status in Rust.

---

# 21. macOS and Linux printing backend

Use CUPS.

The goal is to submit the generated TSPL job as **RAW data**, not pass it back through a vendor raster filter.

The Rust backend should:

1. enumerate CUPS destinations;
2. identify available queues;
3. create a job;
4. start a raw document;
5. stream the `.prn` bytes;
6. finish the document/job;
7. surface CUPS errors clearly.

Keep macOS and Linux behind one `cups.rs` transport interface where possible.

The application should detect when a selected queue cannot accept a raw job and provide a clear diagnostic rather than silently printing garbage.

---

# 22. Network printing

Implement TCP/9100 early because it is simple and useful.

API:

```ts
interface TcpPrinterTarget {
  host: string;
  port: number; // default 9100
}
```

Flow:

```text
connect
write TSPL bytes
flush
close
```

Add connection timeout.

Do not implement unbounded retries.

Network printing is an excellent diagnostic transport because it bypasses local spooler transformations.

---

# 23. USB + Bluetooth hardware transports

USB and Bluetooth are implemented in the **same implementation phase**.

The Android-app findings add one crucial rule:

> **Transport implementation and printer-protocol implementation are separate tasks.**

A successful BLE connection does not imply that sending a TSPL `.prn` file over that connection will print.

The hardware phase must support:

```text
USB
Bluetooth Classic SPP
Bluetooth Low Energy
```

and hand the resolved byte stream to the correct route/session implementation.

---

## 23.1 USB

Recommended implementation:

```text
Rust
  ↓
platform USB API / libusb where appropriate
  ↓
interface discovery
  ↓
bulk OUT
  ↓
printer
```

USB discovery should capture:

```text
VID
PID
manufacturer
product string
serial number, if present
interface class/subclass/protocol
bulk IN/OUT endpoints
```

Do not assume a single VID/PID pair for all Marklife/OEM devices.

### Windows safety

Never silently replace the user's printer driver with WinUSB.

If direct USB access conflicts with the installed printer queue:

```text
prefer spooler for normal printing
        ↓
offer direct USB only when safely accessible
        ↓
never alter driver binding automatically
```

The direct USB route must still pass through the route resolver because X4 and D210 may expect different byte streams.

---

## 23.2 Bluetooth Classic SPP

Known SPP service UUID from the Android app:

```text
00001101-0000-1000-8000-00805F9B34FB
```

Expected connection model:

```text
discover / pair
    ↓
resolve SPP/RFCOMM service
    ↓
connect stream
    ↓
optional model-specific session handshake
    ↓
write route-specific protocol bytes
```

Conceptual target:

```ts
interface BluetoothSppTarget {
  kind: "bluetooth-spp";
  deviceId: string;
  serviceUuid: "00001101-0000-1000-8000-00805F9B34FB";
  channel?: number;
}
```

Do not assume a Windows COM-port name as the cross-platform abstraction.

The app contains model-specific SPP behavior for some devices. Put that logic in a session profile, not the generic SPP transport.

---

## 23.3 BLE known service profiles

### Profile A

```text
Service:
0000ff00-0000-1000-8000-00805f9b34fb

Read:
0000ff01-0000-1000-8000-00805f9b34fb

Write:
0000ff02-0000-1000-8000-00805f9b34fb

Control:
0000ff03-0000-1000-8000-00805f9b34fb

CCCD:
00002902-0000-1000-8000-00805f9b34fb
```

### Profile B

```text
Service:
49535343-fe7d-4ae5-8fa9-9fafd205e455

Read:
49535343-1e4d-4bd9-ba61-23c647249616

Write:
49535343-8841-43f4-a8d4-ecbe34729bb3
```

Implement known-profile recognition **plus** normal GATT discovery.

Do not reject a future printer only because it uses a different UUID set.

---

## 23.4 BLE flow control

Observed Android constants/state:

```text
MAX_PACKET_SIZE = 240
credit window observed = 4
sendPackCount
receivedCreditsCount
notification/control data
MTU request
high connection priority
packet delay / timeout behavior
```

Implement a session layer rather than a naïve chunk loop.

Conceptual state machine:

```text
DISCONNECTED
    ↓
CONNECTING
    ↓
DISCOVERING_SERVICES
    ↓
SUBSCRIBING_NOTIFICATIONS
    ↓
NEGOTIATING_MTU
    ↓
READY
    ↓
SENDING
    ├── credit available → send next packet
    ├── credit exhausted → wait for ack/control
    ├── timeout → bounded retry / fail
    └── disconnect → fail/reconnect policy
```

Suggested session abstraction:

```ts
interface BleSessionProfile {
  id: string;

  services: BleServiceProfile[];

  preferredMaxPacketBytes?: number;

  flowControl:
    | { kind: "none" }
    | {
        kind: "credit";
        initialCredits: number;
        controlCharacteristicUuid?: string;
      };

  writeMode:
    | "with-response"
    | "without-response"
    | "auto";
}
```

Initial Marklife defaults may use the observed values:

```text
preferred packet cap: 240 bytes
credit window: 4
```

but the implementation must adapt to negotiated MTU and observed device behavior.

---

## 23.5 BLE packetization

Calculate payload conservatively:

```text
safePayload =
  min(
    routePreferredMax,
    characteristicLimit,
    negotiatedMtuPayload
  )
```

Do not hard-code:

```text
payload = MTU - 3
```

as the only possible rule across every desktop BLE API.

The Rust backend should report the actual usable write limit it can establish.

---

## 23.6 Unified direct-device transport interface

```ts
type DirectTransport =
  | {
      kind: "usb";
      deviceId: string;
    }
  | {
      kind: "bluetooth-spp";
      deviceId: string;
    }
  | {
      kind: "bluetooth-ble";
      deviceId: string;
      bleProfileId?: string;
    };
```

Rust-side conceptual contract:

```rust
trait ByteTransport {
    fn connect(&mut self) -> Result<(), BridgeError>;
    fn write(&mut self, bytes: &[u8]) -> Result<(), BridgeError>;
    fn disconnect(&mut self) -> Result<(), BridgeError>;
}
```

BLE session logic may call the lower-level write operation multiple times.

---

## 23.7 Direct-device discovery result

```ts
interface DirectPrinterDevice {
  id: string;
  displayName: string;

  transport:
    | "usb"
    | "bluetooth-spp"
    | "bluetooth-ble";

  manufacturer?: string;
  model?: string;
  serialNumber?: string;

  paired?: boolean;
  connected?: boolean;

  usb?: {
    vid: number;
    pid: number;
    interfaces?: UsbInterfaceInfo[];
  };

  bluetooth?: {
    address?: string;
    serviceUuids?: string[];
    rssi?: number;
  };
}
```

Device discovery feeds the **device matcher**, which feeds the **route resolver**.

Do not let transport code guess the protocol.

---

## 23.8 Transport preference

Preference should be configurable per saved printer.

Reasonable default:

```text
1. verified OS RAW queue
2. verified direct USB route
3. verified Bluetooth Classic SPP route
4. verified BLE route
5. TCP/9100 if applicable
6. candidate/experimental routes only when user opts in
```

The word **verified** matters more than the transport order.

For example, a verified X4 BLE route should be preferred over an unverified X4 direct-USB route.

---

## 23.9 Bluetooth permissions

Do not start Bluetooth scans automatically.

Start only from explicit user action:

```text
Add Bluetooth Printer
```

Requirements:

- stop scans promptly;
- handle OS permission denial;
- handle Bluetooth disabled;
- distinguish pairing requirements;
- explain when SPP requires OS-level pairing;
- persist only identifiers needed for printers the user explicitly saves.

---

## 23.10 Hardware-transport acceptance criteria

The combined USB/Bluetooth transport phase is complete when:

- [ ] USB enumeration works without modifying system drivers.
- [ ] USB bulk-write mechanics are implemented behind a transport interface.
- [ ] SPP/RFCOMM discovery and byte-stream writes work.
- [ ] BLE discovery recognizes both known Marklife service profiles.
- [ ] BLE notification subscription works.
- [ ] BLE MTU/write-limit discovery works.
- [ ] BLE supports a credit-based session/window.
- [ ] Initial Marklife packet cap can be configured to 240 bytes.
- [ ] Connection/session failures map to stable domain errors.
- [ ] Device discovery does not directly choose a printer protocol.
- [ ] Route resolver chooses protocol/codec/session.
- [ ] No Windows USB driver is replaced automatically.
- [ ] No label content is logged by default.

Physical printer compatibility is completed in the model-specific phases that follow this transport foundation.

---

# 24. Printer discovery strategy

Initial discovery order:

```text
1. installed OS printers
2. saved network printers
3. manually configured TCP printer
```

Hardware-transport phase:

```text
4. USB discovery
5. Bluetooth Classic SPP discovery
6. Bluetooth Low Energy discovery
7. capability collection
8. device matching
9. route resolution
```

Later:

```text
7. mDNS/network discovery
```

Do not auto-select a printer solely because its name contains `Marklife`.

Use matching confidence:

```ts
interface PrinterMatch {
  printer: PrinterInfo;
  confidence: "exact" | "probable" | "unknown";
  suggestedProfileId?: string;
}
```

Example matching signals:

```text
name contains "Marklife X4"
model metadata indicates X4
known queue/device identity
user previously selected profile for queue
```

Persist user's explicit mapping.

---

# 25. Application UI

Recommended initial layout:

```text
┌────────────────────────────────────────────────────────────────┐
│ ThermalBridge                                                  │
├────────────────┬─────────────────────────────┬─────────────────┤
│ Sources        │ Preview                     │ Print           │
│                │                             │                 │
│ label.pdf      │                             │ Printer         │
│ page 1         │       [label preview]       │ Marklife X4 ▼   │
│                │                             │                 │
│ + Add file     │                             │ Size            │
│                │                             │ 100 × 150 mm ▼  │
│                │                             │                 │
│                │                             │ Media: Gap      │
│                │                             │ Density: 10     │
│                │                             │ Speed: 4        │
│                │                             │                 │
│                │                             │ [ Print ]       │
└────────────────┴─────────────────────────────┴─────────────────┘
```

---

## 25.1 MVP screens

### Main print screen

Required:

- drag/drop;
- file picker;
- PDF page selector;
- live preview;
- printer selector;
- label-size selector;
- rotation;
- fit/fill;
- copies;
- density;
- speed;
- media mode;
- gap/mark settings;
- print button.

### Printer setup

Required:

- list OS printers;
- profile assignment;
- test print;
- default printer;
- TCP printer setup.

### Calibration

Required:

- X offset;
- Y offset;
- darkness;
- test pattern;
- save per printer.

### Diagnostics

Required:

- app version;
- OS;
- architecture;
- printbridge version;
- detected printers;
- selected backend;
- last print result;
- export logs.

---

# 26. Suggested default label sizes

Start with:

```text
100 × 150 mm
4 × 6 in
100 × 100 mm
100 × 200 mm
100 × 250 mm
50 × 30 mm
custom
```

The driver data shows support for many additional sizes.

Do not clutter the first UI with every known paper size.

Allow user-created presets.

---

# 27. Calibration page

Generate the calibration pattern internally.

It should include:

```text
outer border
5 mm grid
horizontal ruler
vertical ruler
center cross
darkness bars
fine 1-pixel line samples
QR code
Code 128 barcode
human-readable labels
```

Calibration flow:

```text
1. print page
2. user measures physical offset
3. enter X/Y correction
4. save correction to printer profile binding
5. print again
```

Store calibration against the specific system printer ID, not globally.

---

# 28. Settings persistence

Use a small validated local settings store.

Example:

```ts
interface AppSettings {
  schemaVersion: number;

  defaultPrinterId?: string;

  printerBindings: Record<
    string,
    {
      profileId: string;
      offsetXmm: number;
      offsetYmm: number;
      density?: number;
      speed?: number;
      media?: MediaSettings;
    }
  >;

  recentLabelSizes: LabelSize[];
  lastDirectory?: string;
}
```

Use schema migrations.

Never trust settings loaded from disk without validation.

---

# 29. Logging

Use structured logs.

Recommended fields:

```text
timestamp
level
component
jobId
printerId
profileId
backend
durationMs
result
errorCode
```

Do not log:

```text
raw label bitmap
full document content
customer names
addresses
barcodes
AWB numbers
```

unless explicitly running a local debug mode.

Diagnostics should be privacy-preserving by default.

---

# 30. Error model

Create domain errors.

Examples:

```text
NO_PRINTER_SELECTED
PRINTER_NOT_FOUND
PRINTER_OFFLINE
RAW_PRINT_UNSUPPORTED
PRINTBRIDGE_START_FAILED
PRINTBRIDGE_PROTOCOL_ERROR
INVALID_LABEL_SIZE
INVALID_BITMAP
PDF_RENDER_FAILED
FILE_UNSUPPORTED
TCP_CONNECTION_FAILED
USB_ACCESS_DENIED
USB_INTERFACE_BUSY
USB_WRITE_FAILED
BLUETOOTH_PERMISSION_DENIED
BLUETOOTH_NOT_AVAILABLE
SPP_PAIRING_REQUIRED
SPP_CONNECT_FAILED
BLE_SERVICE_NOT_FOUND
BLE_WRITE_CHARACTERISTIC_NOT_FOUND
BLE_MTU_NEGOTIATION_FAILED
BLE_FLOW_CONTROL_TIMEOUT
PROTOCOL_ROUTE_NOT_FOUND
PROTOCOL_NOT_VERIFIED
CODEC_FAILED
PRINT_WRITE_FAILED
```

Renderer should display useful user-facing messages while logs retain detailed technical information.

---

# 31. Testing strategy

Testing is critical because a printer protocol bug can waste labels quickly.

---

## 31.1 Unit tests: geometry

Test:

```text
mm → dots
dots → mm
fit
fill
rotation
crop
offset
rounding
```

Include 203-DPI golden values.

---

## 31.2 Unit tests: raster

Create tiny fixtures that are easy to inspect.

Examples:

```text
8 × 1 pixels
16 × 1 pixels
8 × 8 checkerboard
black rectangle
single black pixel
single white pixel
```

Expected byte tests are mandatory.

Example:

```text
pixels:
10000000

expected MSB-first byte:
0x80
```

---

## 31.3 Unit tests: TSPL

Golden test:

Input:

```ts
{
  widthMm: 100,
  heightMm: 150,
  density: 10,
  speed: 4,
  copies: 1,
}
```

Header should contain exactly the expected CR/LF-separated command sequence.

Use binary fixture comparison for complete jobs.

Do not snapshot huge byte arrays as human-readable JSON.

---

## 31.4 Unit tests: route resolver

Test combinations such as:

```text
X4 + CUPS                 → TSPL + raw mono
X4 + BLE profile A        → X4 BT v7 + JBIG + BLE credit session
D210 + SPP                → D210 BT v5 + D210 codec + SPP session
unknown + BLE             → unresolved/explicit generic route
```

A route must not become `verified` through name matching alone.

---

## 31.5 Unit tests: Bluetooth session

Test:

```text
240-byte cap
smaller negotiated payload
exact-multiple packet sizes
final partial packet
credit window = 4
ack releases credit
timeout
disconnect mid-job
retry bound
notification parsing
```

Use a fake BLE transport.

---

## 31.6 Protocol golden vectors

Create independent byte-level fixtures for:

```text
TSPL
D210 desktop POS/ESC
X4 Bluetooth v7
D210 Bluetooth v5
```

For X4 Bluetooth, use very small deterministic images so JBIG/framing changes are reviewable.

For D210 Bluetooth, separate codec golden vectors from protocol-frame golden vectors.

---

## 31.7 Integration tests: printbridge

Rust tests should validate:

- protocol parsing;
- invalid path rejection;
- printer-not-found;
- temp-file handling;
- TCP mock server writes exact bytes.

OS spooler integration should have a fake/mock abstraction where practical.

---

## 31.8 E2E tests

Playwright Electron tests:

```text
launch app
drop fixture PDF
select mock printer
change label size
render preview
click print
verify main receives validated job
verify mock transport gets expected .prn
```

Production E2E must not require physical hardware.

---

# 32. Golden printer fixtures

Create deterministic fixtures in:

```text
packages/test-fixtures/expected/
```

Recommended:

```text
100x150-black-square.prn
100x150-grid.prn
4x6-barcode.prn
50x30-qr.prn
```

Generate them using our encoder and review the byte structure.

Once a fixture is physically verified on an X4, mark it:

```text
hardwareVerified: true
```

and never casually regenerate it.

---

# 33. Physical X4 verification protocol

Cursor cannot perform this step autonomously.

A human with the X4 must validate physical output.

Use the following sequence.

## Test 1: command transport

Send:

```text
SIZE 100 mm,150 mm
GAP 2 mm,0 mm
DENSITY 10
SPEED 4
DIRECTION 0,0
CLS
PRINT 1,1
```

Expected:

- printer accepts command stream;
- may feed a blank label depending on firmware.

## Test 2: one black byte

Create a minimal BITMAP job.

Verify:

```text
bit order
black polarity
x/y orientation
```

## Test 3: 8 × 8 checkerboard

Verify row ordering.

## Test 4: full border

Verify printable dimensions.

## Test 5: QR + Code 128

Verify barcode sharpness.

## Test 6: grayscale image

Compare threshold versus error diffusion.

Record desktop/USB findings in:

```text
docs/protocol-tspl.md
```

Then validate Bluetooth separately.

## X4 Bluetooth verification

Use the same small source fixtures through:

```text
Bluetooth SPP, if advertised
BLE, if advertised
```

Verify:

```text
service profile
write characteristic
control/notification characteristic
usable packet size
credit/ack behavior
JBIG payload compatibility
X4 protocol header fields
paper type
density
copies
multi-packet jobs
connection recovery
```

Record in:

```text
docs/protocol-marklife-x4-bluetooth.md
docs/hardware-transports.md
```

---

# 34. Cursor implementation plan

Cursor should execute the following milestones in order.

The new Android findings mean there are **two validation tracks**:

```text
Track A: desktop/raw protocol path
Track B: direct USB/Bluetooth + model-specific protocol path
```

Do not build "Bluetooth support" as a generic byte-pipe milestone and declare model compatibility complete.

---

## Phase 0 — Repository bootstrap

### Tasks

1. initialize Git repository;
2. initialize pnpm workspace;
3. create strict TypeScript base configuration;
4. configure ESLint and Prettier;
5. configure Vitest;
6. create Electron shell;
7. create Rust `printbridge`;
8. create package boundaries from §7;
9. add CI for lint/typecheck/test;
10. ensure root commands work.

### Acceptance criteria

```text
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm dev
cargo test
```

all succeed.

---

## Phase 1 — Raster foundation

Implement:

```text
geometry
RGBA model
white alpha compositing
grayscale
threshold
Floyd-Steinberg
rotate
mirror
negative
1-bit packing
```

Acceptance:

- deterministic tiny-fixture tests;
- no Electron dependency;
- no printer-specific code.

---

## Phase 2 — Generic protocol foundation

Implement:

```text
BinaryWriter
PrinterProtocolEncoder contract
TSPL encoder
initial ESC/POS/POS raster abstraction
```

TSPL commands:

```text
SIZE
GAP
BLINE
REFERENCE
OFFSET
DENSITY
SPEED
DIRECTION
CLS
BITMAP
PRINT
```

Acceptance:

- deterministic `.prn` TSPL fixtures;
- binary-safe encoding;
- ESC/POS module exists independently from D210 quirks.

---

## Phase 3 — Device registry and route resolver

Implement:

```text
DeviceProfile
PrinterRoute
TransportKind
ProtocolId
CodecId
SessionProfileId
device matcher
route resolver
route verification state
```

Seed:

```text
X4
D210
Generic TSPL
Generic ESC/POS
```

Acceptance:

- route tests pass;
- X4 SPP resolves to **Marklife protocol 7**, not TSPL, based on the analyzed Android routing logic;
- X4 does not receive a BLE route unless the connected hardware actually advertises BLE;
- D210 Bluetooth does not resolve to generic ESC/POS merely because the desktop D210 filter is POS-style;
- verified and candidate routes are represented separately.

---

## Phase 4 — CLI desktop proof of concept

Build:

```bash
thermalbridge-build \
  --input ./label.png \
  --device marklife-x4 \
  --transport cups \
  --size 100x150 \
  --output ./job.prn
```

Then add print submission through an OS queue.

Acceptance:

- X4 TSPL `.prn` can be generated without Electron;
- first physical X4 desktop-route print succeeds.

---

## Phase 5 — Rust printbridge base

Implement methods:

```text
bridge.version
printers.list
printer.printRawFile
printer.printTcpFile
diagnostics.system
```

Backends:

```text
Windows RAW spooler
CUPS
TCP/9100
```

Acceptance:

- bridge lifecycle is stable;
- printer enumeration works;
- known `.prn` files can be submitted.

---

## Phase 6 — Electron shell and IPC

Implement:

```text
main
preload
renderer
typed IPC
settings
logs
bridge manager
```

Security requirements from §9 are mandatory.

Acceptance:

- renderer has no unrestricted Node access;
- printer list works through typed IPC.

---

## Phase 7 — File import and preview

Implement:

```text
PNG
JPEG
PDF.js
page selection
drag/drop
preview
fit/fill
rotation
exact final raster
```

Acceptance:

- selected PDF page renders correctly to 100 × 150 mm;
- preview uses same transform model as print.

---

## Phase 8 — X4 desktop route verification

Physically verify:

```text
TSPL bit order
black polarity
BITMAP mode
row padding
printable width
gap / black mark
density
speed
copies
rotation
offset
```

Mark only proven route fields as verified.

Acceptance:

- multiple shipping/barcode/QR fixtures print correctly.

---

## Phase 9 — Calibration UX

Implement:

```text
X/Y offset
density
speed
test pattern
save per printer route
```

Acceptance:

- calibration survives restart;
- calibration is scoped to saved printer/route.

---

## Phase 10 — USB + Bluetooth transport foundation

**USB and Bluetooth are implemented together in this phase.**

### USB

Implement:

```text
enumeration
VID/PID metadata
interface/endpoints
safe claiming
bulk writes
disconnect/reconnect
```

### SPP

Implement:

```text
paired-device discovery
RFCOMM/SPP UUID 00001101-0000-1000-8000-00805F9B34FB
connect
read/write stream
disconnect
```

### BLE

Implement:

```text
scan
known service profile A
known service profile B
generic service discovery
notification subscription
MTU/write-limit handling
packet cap
credit/session window
timeouts
disconnect/reconnect
```

Initial compatibility settings:

```text
observed vendor max packet: 240
observed credit window: 4
```

Acceptance:

- transport tests work with fakes/mocks;
- USB can send a test byte stream to a compatible test target;
- SPP can exchange bytes;
- BLE can discover profile and send a multi-packet synthetic payload under credit control.

This phase does **not** yet mean X4/D210 Bluetooth print compatibility is complete.

---

## Phase 11 — X4 Bluetooth protocol v7 over SPP

The Android application gives a concrete X4 Bluetooth route:

```text
device matcher: X4
connection: Bluetooth Classic SPP
SPP UUID: 00001101-0000-1000-8000-00805F9B34FB
print protocol: 7
payload: custom X4 binary framing + JBIG-compatible image data
```

Do **not** use raw desktop TSPL as the primary X4 Bluetooth implementation.

### Tasks

1. discover/pair the physical X4;
2. open the standard SPP/RFCOMM service;
3. reconstruct `X4Protocol.getHeader()` field-by-field;
4. reproduce the grayscale conversion used by the X4 protocol;
5. implement an independently licensed/implemented JBIG T.85-compatible codec path;
6. implement protocol-7 framing;
7. send protocol-7 jobs over the SPP stream;
8. parse any returned status/ack data that is required for stable printing;
9. create tiny deterministic golden vectors;
10. validate real shipping-label, QR, and barcode jobs.

Observed app behavior includes:

```text
Bitmap
  ↓
convertBitmapToGrayBytes(...)
  ↓
JniJbigCodec.encodeV2(...)
  ↓
X4Protocol.getHeader(...)
  ↓
framed payload
  ↓
SPP transport
```

### BLE policy for X4

The analyzed Marklife build explicitly routes X4 through SPP.

Therefore:

```text
do not fabricate an X4 BLE route
```

If another physical X4 revision advertises BLE:

1. record its GATT services;
2. determine whether protocol 7 is accepted;
3. add a candidate route;
4. physically verify it;
5. only then mark the route verified.

### Acceptance criteria

- [ ] X4 is detected as an SPP-capable Marklife model.
- [ ] RFCOMM connection succeeds.
- [ ] Protocol resolver selects `marklife-x4-bt-v7`.
- [ ] Protocol resolver does not select TSPL for the Android-compatible SPP route.
- [ ] Independent JBIG-compatible test vectors pass.
- [ ] X4 protocol-7 frame tests pass.
- [ ] A small physical label prints successfully over SPP.
- [ ] QR and Code 128 fixtures scan.
- [ ] Multi-packet jobs are stable.
- [ ] No vendor `.so`, APK bytecode, or copied decompiled code ships.
- [ ] Any X4 BLE route remains absent/experimental until hardware proves it exists.

---

## Phase 12 — D210 future-stage support

D210 is the second model family.

### Desktop route

Implement and verify:

```text
ESC/POS GS v 0 raster
24-row compatibility chunking
OS queue
direct USB, if accepted
```

### Bluetooth route

Implement clean-room:

```text
protocol ID 5
paper type
density gear
density
wake
enable printer
bitmap block
print-line dots
stop
return paper
position/movement
D210 bitmap codec
```

Prefer SPP when that is what the physical D210 advertises.

Support BLE as well if a target hardware revision advertises a compatible BLE route.

Acceptance:

- D210 test page prints over desktop/USB path;
- D210 test page prints over its advertised Bluetooth path;
- density and label feed behavior work;
- no `libCode.so` is bundled.

---

## Phase 12.5 — P50 profile and protocol-3 support

P50 is the third concrete first-class profile.

### Implement

```text
model aliases:
P50
P5OS
PS50
P50S

203-DPI rendering
48-mm printable width
50-mm media-width compatibility
40×30 default label
continuous + gap label media
density level mapping:
1 → 3
2 → 10
3 → 14

battery / firmware / serial reads
shutdown-time read/write when supported
protocol-3 encoder
Bluetooth capability detection
```

### P50 built-in label presets

Add:

```text
20×10
25×15
30×15
30×20
40×20
40×30
40×40
40×60
40×80
45×75
50×20
50×30
50×50
50×70
50×80 mm
```

### Acceptance criteria

- [ ] P50 aliases resolve to `marklife-p50`.
- [ ] P50 uses protocol family 3.
- [ ] P50 does not expose an X4 speed slider.
- [ ] Density levels map exactly to `3/10/14`.
- [ ] Default label is 40×30 mm.
- [ ] 50-mm stock respects approximately 48-mm printable width.
- [ ] Gap and continuous media can be selected.
- [ ] P50 presets are filtered correctly.
- [ ] Battery/firmware/serial/shutdown attributes are separated from print-job settings.
- [ ] Bluetooth route remains candidate until physical P50 transport/protocol behavior is verified.

---

## Phase 13 — Marklife compatibility registry expansion

Use Android protocol classes as the roadmap:

```text
S8         protocol 1
S2         protocol 2
P50        protocol 3
P12        protocol 4
P15        protocol 6
X2 BLE     protocol 8
X2         protocol 9
X8         protocol 10
R15        protocol 11
D100       protocol 12
U4         protocol 13
AiPrint    protocol 14
```

For each model/protocol family:

```text
identify model aliases
identify transport
identify codec
reconstruct protocol framing
implement encoder
add golden tests
physically verify
mark route verified
```

Do not create one giant switch statement.

---

## Phase 13.5 — Multi-printer + multi-label product layer

### Printer tasks

Implement:

```text
multiple saved printers
default printer
default printer per label preset
printer-specific calibration
printer-specific media defaults
route-specific controls
compatibility/status matrix
```

### Label tasks

Implement:

```text
MediaProfile
LabelPreset
custom sizes
shipping presets
product/barcode presets
PDF page-size detection
auto-rotation
printer/label compatibility resolver
saved custom presets
```

### Acceptance criteria

- [ ] Two or more printers can be configured simultaneously.
- [ ] Each printer keeps independent route/calibration/settings.
- [ ] Label presets are independent of printer profiles.
- [ ] 100×150, 4×6, 100×100, and 50×30 presets work.
- [ ] Custom label sizes can be saved.
- [ ] PDF physical page size can suggest a preset.
- [ ] Unsupported printer/label combinations are blocked or warned.
- [ ] Printer controls are route-capability-driven.
- [ ] D210 never exposes unverified X4/TSPL settings.
- [ ] Batch data model can assign different printers/formats per item.

---

## Phase 14 — Packaging

### Windows

```text
NSIS installer
x64 printbridge
code signing when credentials are available
```

### macOS

```text
Apple Silicon first
Intel if retained
DMG + ZIP
Developer ID signing
hardened runtime
notarization
Bluetooth usage descriptions/permissions
```

### Linux

```text
AppImage
DEB
BlueZ/CUPS integration requirements
udev guidance where direct USB requires it
```

Acceptance:

- correct sidecar is packaged;
- permissions are documented;
- fresh-machine smoke tests pass.

---

## Phase 15 — Release hardening

Add:

```text
crash-safe temp cleanup
bridge restart
Bluetooth reconnect
USB detach
printer disconnect
BLE timeout/retry bounds
queue errors
offline state
diagnostic export
corrupted settings recovery
large-PDF limits
```

---

## Phase 16 — Generic protocol support

Strengthen:

```text
Generic TSPL
Generic ESC/POS
```

Then consider:

```text
ZPL
CPCL
ESC/POS variants
```

The generic path should use the same route resolver and transport infrastructure.

---

# 35. Cursor rules for this repository

Add the following to Cursor project rules.

## Engineering behavior

- Work in small, reviewable increments.
- Do not refactor unrelated modules while completing a milestone.
- Preserve strict TypeScript.
- Avoid `any`.
- Validate all IPC/native-boundary data.
- Do not introduce a dependency when a small standard-library implementation is clearer.
- Keep `thermal-core` platform-independent.
- Keep printer transport out of renderer code.
- Never execute arbitrary shell commands based on renderer input.
- Never send binary printer data through string conversions.
- Write tests before modifying bitmap byte-order logic.
- Prefer explicit domain types over primitive argument lists.
- Return typed domain errors.
- Keep vendor compatibility assumptions isolated in device profiles, codecs, protocol encoders, and route/session profiles.
- Do not copy code from vendor binaries.
- Do not bundle vendor drivers or Android native SDK libraries.
- Never assume the same printer model uses the same protocol over every transport.
- Never implement BLE as only an MTU chunk loop when the route requires credit/ack flow control.
- A discovered device name alone must never upgrade a route to `verified`.

## Definition of done for each task

A task is not complete until:

```text
lint passes
typecheck passes
unit tests pass
changed behavior has tests
errors are handled
no debug console spam remains
```

---

# 36. Suggested Cursor master prompt

Use this as the initial project instruction after the repository exists:

```text
You are implementing ThermalBridge Desktop, a production-quality cross-platform
Electron application for printing thermal labels.

README.md is the architectural source of truth.

Evidence from Marklife desktop drivers and the Marklife Android app establishes
that printer model, transport, codec, protocol, and session behavior are separate
concerns.

Critical constraints:

1. Electron + React + strict TypeScript.
2. thermal-core is pure TypeScript and platform-independent.
3. Keep bitmap codecs separate from printer protocol framing.
4. Use a device registry + route resolver.
5. A route is selected from model + transport + observed capabilities.
6. Never assume one model uses one protocol on every transport.
7. X4 desktop is TSPL-style, while the analyzed Android app routes X4 through
   Bluetooth Classic SPP using Marklife protocol 7 with a JBIG-compatible payload path.
8. D210 desktop is POS/ESC-style, while D210 Bluetooth uses Marklife protocol 5
   with a model-specific bitmap codec/framing path.
9. Rust printbridge handles Winspool, CUPS, TCP, USB, SPP, BLE, and native
   connection/session mechanics.
10. USB and Bluetooth must be implemented together in the same hardware phase.
11. Bluetooth must support both Classic SPP and BLE.
12. Known SPP UUID:
    00001101-0000-1000-8000-00805F9B34FB
13. Recognize the two known BLE service profiles documented in README.
14. BLE must support notification/control flow, MTU/write limits, bounded retries,
    and credit-based flow control where required.
15. The Android app exposes MAX_PACKET_SIZE=240 and an observed credit window of 4;
    treat these as compatibility evidence, not universal Bluetooth constants.
16. No vendor driver binary, APK native .so, libjbigkit.so, or libCode.so may be
    bundled or executed by the application.
17. Reimplement compatibility behavior independently.
18. Renderer must have no unrestricted Node.js access.
19. Validate all IPC and printbridge messages.
20. Keep printer bytes as Uint8Array/byte buffers; never round-trip binary through
    JavaScript strings.
21. Add byte-level golden tests for every codec and protocol.
22. A route remains candidate/experimental until physically verified.
23. Do not begin broad UI polish before X4 desktop protocol tests pass.
24. Do not claim broad Marklife compatibility until each model route has tests and
    hardware verification.
25. Printer model, route, transport, protocol, codec, MediaProfile, LabelPreset,
    and template are separate domain objects.
26. Support multiple saved printers and multiple physical label formats without
    hard-coded model branches in UI/business logic.
27. X4, D210, and P50 have independent settings schemas. Never reuse X4 density/
    speed/media semantics for D210 or P50.
28. P50 protocol-3 density levels map 1→3, 2→10, 3→14; P50 has no verified speed
    setting in the analyzed protocol path.
29. D210 desktop settings include its own 0/1/2 darkness, media-type, locate-label,
    and continuous-feed controls.
30. X4 vendor density default is 10 while ThermalBridge may use 14 as its app default.

Implementation order is defined in §34.

For every task:
- inspect existing code first;
- preserve package boundaries;
- make the smallest coherent change;
- add/update tests;
- run lint, typecheck, unit tests, Rust tests, and relevant E2E tests;
- update protocol/device documentation when evidence changes;
- identify unknown protocol fields explicitly rather than inventing semantics.

Never silently invent printer-specific behavior. Unknown behavior must remain an
explicit assumption, candidate route, TODO requiring capture, or hardware test.
```

---

# 37. Coding standards

## TypeScript

Use:

```text
strict: true
noUncheckedIndexedAccess: true
exactOptionalPropertyTypes: true
```

Prefer:

```ts
type Millimeters = number;
type Dots = number;
```

For especially error-prone geometry, consider branded units later.

Avoid hidden mutation in raster transforms.

---

## Rust

Use:

```text
rustfmt
clippy
Result<T, BridgeError>
```

No `unwrap()` in production transport paths unless an invariant is proven and documented.

Normalize OS errors into stable bridge error codes.

---

# 38. Performance targets

Typical 100 × 150 mm at 203 DPI:

```text
≈ 799 × 1199 pixels
≈ 958k pixels
≈ 120 KB packed monochrome bitmap
```

This is small.

A normal shipping label should not require GPU-heavy processing.

Target:

```text
preview update:        perceived instant
final rasterization:   < 500 ms on typical desktop hardware
protocol encoding:     negligible
app idle memory:       reasonable for Electron
```

Do not prematurely optimize.

Profile real large PDFs before adding worker complexity.

---

# 39. Memory safety for large PDFs

Defend against:

```text
200-page PDFs
very large scans
100+ megapixel images
malformed PDFs
```

Rules:

- render one selected PDF page at a time;
- cap preview dimensions;
- cap final raster based on printer dimensions;
- do not retain unnecessary RGBA copies;
- release canvas/image resources;
- enforce reasonable source file limits;
- show a clear error instead of crashing.

---

# 40. Print job lifecycle

Create a stable state machine:

```text
idle
  ↓
rendering
  ↓
encoding
  ↓
spooling
  ↓
submitted
```

Failure states:

```text
render-failed
encode-failed
printer-unavailable
spool-failed
cancelled
```

Do not report `printed` merely because bytes were accepted by the OS spooler.

Use wording such as:

```text
"Sent to printer"
```

unless actual device completion can be verified.

---

# 41. Job IDs

Assign UUIDs.

Example:

```text
job_8f...
```

Use the same job ID in:

```text
renderer state
main logs
temp .prn filename
printbridge request
diagnostic output
```

This makes support dramatically easier.

---

# 42. Temp files

Store jobs under an application-owned temp directory:

```text
<TEMP>/thermalbridge/jobs/
```

Requirements:

- unpredictable filenames;
- restrictive permissions where possible;
- cleanup after print;
- cleanup stale jobs at startup;
- never use original user filename as executable/shell input.

---

# 43. Diagnostics bundle

Provide an "Export Diagnostics" action.

Include:

```text
app version
platform
architecture
Electron version
printbridge version
printer list
selected printer metadata
selected profile
non-sensitive settings
recent error codes
structured logs
```

Exclude:

```text
label contents
PDF contents
customer names
addresses
barcodes
AWB numbers
```

Output as ZIP later if useful.

---

# 44. Release pipeline

GitHub Actions matrix:

```text
ubuntu-latest
windows-latest
macos-latest
```

CI on every PR:

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
cargo fmt --check
cargo clippy
cargo test
```

Release builds should be separate from normal CI.

Signing secrets must never be committed.

---

# 45. Platform signing

## macOS

Production distribution should include:

```text
Developer ID Application signing
hardened runtime
notarization
stapling
```

The Rust sidecar must be included in the signed application bundle and covered by the signing process.

## Windows

Production installer and binaries should be Authenticode-signed.

## Linux

Signing/repository packaging can be added according to distribution channel.

Do not block internal alpha builds on commercial signing credentials.

---

# 46. Future commercial features

After reliable printing:

## Shipping label automation

Potential integrations/workflows:

```text
eMAG
DHL
Sameday
FAN Courier
DPD
GLS
UPS
FedEx
Amazon
Shopify
WooCommerce
```

Potential feature:

```text
A4 document
   ↓
detect shipping label region
   ↓
extract
   ↓
rotate/crop
   ↓
100 × 150
   ↓
one-click print
```

Keep provider-specific extraction in separate modules.

---

## Batch printing

Later:

```text
drop 30 labels
reorder
select copies
print queue
retry failures
```

---

## Watched folder

Later:

```text
watch ~/Downloads/Labels
automatically detect new supported file
show notification
optional auto-print rule
```

This must be opt-in.

---

## Printer-language expansion

Potential interface:

```ts
interface PrinterLanguageEncoder {
  readonly id: string;

  encode(job: RasterPrintJob): Uint8Array;
}
```

Implement/retain:

```text
TSPL
ESC/POS/POS raster
Marklife model-specific protocols
ZPL later
CPCL later
```

---

# 47. Questions still requiring empirical verification

These should be tracked explicitly.

## X4 bitmap encoding

Verify:

```text
MSB-first?
1 = black?
BITMAP mode = 1?
row padding?
```

## Printable width

Measure actual printable width in dots.

Do not assume exactly:

```text
812
```

simply because the printer is nominally 4 inches at 203 DPI.

## Gap behavior

Confirm:

```text
GAP height
GAP offset
sensor calibration behavior
```

## Black mark behavior

Confirm `BLINE` parameters.

## Status queries

Unknown/not required for MVP.

Potential future reverse-engineering:

```text
paper out
cover open
ready/busy
temperature/error
```

## USB details

Still to establish conclusively:

```text
VID
PID
interface number
bulk OUT endpoint
bulk IN endpoint
printer class vs vendor class
```

These are part of the combined USB + Bluetooth hardware-transport phase.

## Bluetooth details

Known from the Android app:

```text
SPP UUID:
00001101-0000-1000-8000-00805F9B34FB

BLE profile A:
service 0000ff00-0000-1000-8000-00805f9b34fb
read    0000ff01-0000-1000-8000-00805f9b34fb
write   0000ff02-0000-1000-8000-00805f9b34fb
control 0000ff03-0000-1000-8000-00805f9b34fb

BLE profile B:
service 49535343-fe7d-4ae5-8fa9-9fafd205e455
read    49535343-1e4d-4bd9-ba61-23c647249616
write   49535343-8841-43f4-a8d4-ecbe34729bb3

observed max packet constant: 240
observed initial/control credit window: 4
```

Still verify per physical model/revision:

```text
X4: SPP is evidenced by the analyzed app; verify physical revision
D210: SPP is evidenced by the analyzed app; verify physical revision
other models: determine which transport(s) are advertised
Bluetooth device name / aliases
which BLE profile is used
negotiated MTU
actual stable payload size
write-with-response vs without-response
notification semantics
credit/ack byte semantics
timeout/retry timing
status reporting
SPP pre-print handshake
```

## X4 Bluetooth protocol details

Still reconstruct and verify:

```text
exact grayscale conversion
exact meaning of the observed 135 parameter
JBIG encodeV2-compatible settings
all X4 binary header fields
payload length/checksum fields
paper type encoding
density mapping
copy/index semantics
job termination
status/ack interaction
```

## D210 details

Desktop:

```text
GS v 0 is established
24-row raster chunking is established
still verify print width
bit polarity / row representation
density control
feed/position behavior
direct USB acceptance
```

Bluetooth:

```text
protocol 5 frame format
DFunction.code-compatible codec behavior
zlib/raw framing details
paper type mapping
density gear mapping
wake/enable sequence
bitmap block format
stop/return/location commands
SPP readiness/status behavior
BLE route if a hardware revision advertises BLE
```

# 48. MVP acceptance criteria

The MVP is complete when all of the following are true:

- [ ] App launches on Windows.
- [ ] App launches on macOS Apple Silicon.
- [ ] App launches on Linux x64.
- [ ] User can drag/drop PNG.
- [ ] User can drag/drop JPEG.
- [ ] User can drag/drop PDF.
- [ ] User can select a PDF page.
- [ ] User can preview 100 × 150 mm output.
- [ ] User can rotate label.
- [ ] User can select Fit/Fill.
- [ ] App discovers OS printers.
- [ ] User can bind Marklife X4 profile to a printer.
- [ ] App generates TSPL without vendor executable.
- [ ] App submits RAW job on Windows.
- [ ] App submits RAW job via CUPS on macOS.
- [ ] App submits RAW job via CUPS on Linux.
- [ ] TCP/9100 transport works.
- [ ] Density is configurable.
- [ ] Speed is configurable.
- [ ] Gap media works.
- [ ] Copies work.
- [ ] Calibration offsets persist.
- [ ] Test print works.
- [ ] Printed QR code scans.
- [ ] Printed Code 128 barcode scans.
- [ ] Printed 100 × 150 shipping label is correctly scaled.
- [ ] No vendor binary is shipped.
- [ ] Renderer has no Node.js access.
- [ ] Unit tests cover binary packing and TSPL output.
- [ ] Packaged application contains the correct native bridge.
- [ ] Errors are surfaced clearly.
- [ ] Logs contain no label/customer content by default.


Protocol-routing criteria:

- [ ] X4 OS-queue route resolves to TSPL.
- [ ] X4 Android-compatible SPP route resolves to protocol 7, not raw TSPL.
- [ ] X4 Bluetooth protocol v7 encoder has golden tests.
- [ ] X4 Bluetooth JBIG-compatible codec has golden tests.
- [ ] D210 desktop route has an independent POS/ESC adapter.
- [ ] D210 Bluetooth protocol v5 is represented as a separate route.
- [ ] Device name matching alone never marks a route verified.
- [ ] BLE profile A and B are recognized.
- [ ] SPP UUID 0x1101 route is supported.
- [ ] BLE credit-based flow-control tests pass.

Hardware-transport release criteria:

- [ ] Direct USB transport works on at least one verified target printer.
- [ ] Bluetooth SPP transport is implemented.
- [ ] Bluetooth BLE transport is implemented.
- [ ] The app detects whichever Bluetooth mode the target advertises.
- [ ] BLE chunking is MTU-aware.
- [ ] The user can select USB/Bluetooth transport explicitly.
- [ ] USB/Bluetooth implementation never silently replaces a Windows device driver.

---

# 49. Recommended first implementation sprint

Cursor should start with this sequence:

```text
1. scaffold monorepo
2. add strict TS configuration
3. create thermal-core
4. create bitmap-codecs
5. create printer-protocols
6. create device-registry
7. implement mmToDots / geometry
8. implement BinaryWriter
9. implement TSPL encoder
10. add TSPL golden tests
11. implement raw 1-bit packing
12. add 8x1 / 8x8 bitmap tests
13. implement threshold
14. implement Floyd-Steinberg
15. create X4 device profile
16. create D210 candidate device profile
17. implement route resolver
18. prove X4 OS route resolves to TSPL
19. prove X4 SPP resolves to protocol 7 and not TSPL
20. create CLI that writes X4 test-label.prn
21. create Rust bridge protocol
22. implement TCP transport
23. implement Windows RAW spooler
24. implement CUPS RAW backend
25. wire Electron main to bridge
26. implement printer list UI
27. implement PNG/JPEG import
28. implement PDF.js rendering
29. wire X4 desktop print pipeline
30. physically verify X4 desktop route
31. correct TSPL bitmap assumptions
32. add calibration
33. implement USB + SPP + BLE transport foundation together
34. implement and physically test X4 protocol 7 over SPP
35. add known BLE service profiles
36. add BLE MTU-aware scheduler and credit-window support
37. finish X4 protocol-7/JBIG golden vectors and error handling
38. physically verify X4 protocol-7 SPP route with production-size jobs
39. implement D210 desktop POS route
40. implement D210 Bluetooth v5 codec/protocol
41. physically verify D210
42. implement multiple saved printers
43. implement MediaProfile + LabelPreset registries
44. add 100×150 / 4×6 / 100×100 / 50×30 presets
45. implement custom label sizes + compatibility resolver
46. add PDF physical-size detection + auto-rotation
47. add route-capability-driven print controls
48. add concrete X4 settings schema
49. add concrete D210 settings schema
50. add concrete P50 profile/settings/presets
51. add P50 protocol-3 golden tests
52. package per OS
```

The highest-risk checkpoints are:

```text
30 — X4 desktop protocol verification
34 — X4 protocol-7-over-SPP verification
38 — X4 protocol-7 production-job verification
41 — D210 route verification
```

Do not bury those risks under UI polish.

---

# 50. Definition of the first real proof of concept

A successful proof of concept is not "Electron opens."

It is:

```bash
thermalbridge-build \
  ./shipping-label.png \
  --profile marklife-x4 \
  --size 100x150 \
  --output ./job.prn
```

followed by:

```bash
thermalbridge-print \
  ./job.prn \
  --printer "Marklife X4"
```

and a correctly rendered physical label emerging from the printer.

Once that works, the technical risk is substantially reduced and the Electron UI becomes normal application engineering.

---

# 51. Final architecture principle

Keep these concerns independent:

```text
SOURCE
PDF / PNG / JPEG
        ↓
DOCUMENT RENDERING
        ↓
RASTER / GEOMETRY
        ↓
DEVICE + CONNECTION CAPABILITIES
        ↓
MEDIA PROFILE + LABEL PRESET
        ↓
FORMAT COMPATIBILITY RESOLVER
        ↓
ROUTE RESOLVER
        ↓
BITMAP CODEC
raw mono / JBIG-compatible / model-specific
        ↓
PRINTER PROTOCOL
TSPL / ESC-POS / Marklife v7 / Marklife v5 / future
        ↓
SESSION
raw stream / SPP / BLE credit-flow
        ↓
TRANSPORT
Winspool / CUPS / TCP / USB / Bluetooth SPP / Bluetooth BLE
        ↓
DEVICE
X4 / D210 / future Marklife model
```

The Android application demonstrates why this separation matters.

A single printer model can use a different protocol depending on its connection path. Conversely, several printer models may share a transport while using different protocol encoders.

If these boundaries remain clean, the project can evolve from an X4 utility into a broad Marklife-compatible desktop printing platform without rewriting the application.

---

# 52. Immediate next action for Cursor

Create the repository skeleton and complete:

```text
Phase 0
Phase 1
Phase 2
Phase 3
```

The first pull request should contain:

```text
workspace
Electron shell
thermal-core
bitmap-codecs interfaces
printer-protocols
TSPL encoder
initial ESC/POS abstraction
device-registry
X4 profile
D210 candidate profile
route resolver
Rust bridge skeleton
unit tests
CI
```

It should **not** yet contain:

```text
complex UI polish
vendor native libraries
firmware update support
automatic driver replacement
shipping-provider integrations
automatic label detection
unsupported "all printers" claims
```

The first engineering objective is:

```text
deterministic raster output
        +
deterministic protocol output
        +
correct route selection
```

The first hardware objective remains a verified X4 desktop print.

The first direct-device objective is then X4 over its advertised USB/Bluetooth route using the correct protocol—not merely a successful Bluetooth connection.

D210 follows as the second fully verified model family.

