# Reverse-engineering notes

This project is a clean-room compatibility layer. Notes here record *observable* printer behavior only.

## Do not

- Copy code from `rastertoX4` or vendor DLLs
- Bundle vendor installers
- Treat disassembly as source

## Still unverified on hardware

- BITMAP bit order and polarity
- Exact printable width in dots
- GAP / BLINE sensor parameters
- USB VID/PID, interface, and bulk OUT endpoint
- BLE GATT service and characteristic UUIDs

When a physical test confirms a value, write it here with the date and the fixture name, then update `packages/printer-profiles`.

## Phomemo M110 (BLE)

Observed from independent reverse-engineering of the official app (not vendor source):

- Advertised name is often a serial such as `Q002E0CP0670069`, not `M110`
- GATT profile A: service `0000ff00-…`, write `0000ff02-…`, notify `0000ff03-…`
- Print dialect: `ESC N 0x0d` speed, `ESC N 0x04` density, `0x1f 0x11` media, then `GS v 0` raster (384 dots / 48 bytes per line), footer `1f f0 05 00 1f f0 03 00`
- Init commands must be separate GATT writes with short delays; raster in 128-byte chunks
- GS v 0 `xL` is the **label** width in bytes, not always 48. A 40×30 mm job is 40 bytes × 240 lines (the official CUPS filter does the same). Padding a 40 mm canvas to the 384-dot head and centering it made firmware left-align that 48 mm raster onto 40 mm stock, so preview-centered content printed shifted left. Layouts wider than 48 mm are composed at the editor size and center-cropped to 384 dots.
