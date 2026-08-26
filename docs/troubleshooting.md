# Troubleshooting

## printbridge failed to start

Build the sidecar, then restart the app:

```bash
cd native/printbridge && cargo build
```

The desktop app looks for `native/printbridge/target/debug/printbridge` in development.

## USB_DRIVER_CONFLICT

A standard OS printer driver owns the USB interface. ThermalBridge will not detach kernel drivers. Use the **OS Queue** backend instead.

## BLE scan finds devices but print fails

Marklife X4 GATT UUIDs are placeholders (`PLACEHOLDER_X4_SERVICE_UUID`). Check printbridge stderr for discovered service/characteristic UUIDs and store them on the printer binding.

## Preview looks sharp but print is wrong size

Preview and print both rasterize at the profile DPI (203 for X4). If physical output is cropped, measure printable width and update the profile. Do not assume 812 dots.

## Settings reset

Corrupt `settings.json` is replaced with defaults (`schemaVersion: 1`). The file lives in the Electron userData directory.
