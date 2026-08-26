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
