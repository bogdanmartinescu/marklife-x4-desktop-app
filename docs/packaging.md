# Packaging

electron-builder is configured in `apps/desktop/electron-builder.yml`.

Targets:

- Windows: NSIS
- macOS: DMG + ZIP
- Linux: AppImage + DEB

The packaged app must include the `printbridge` binary for that platform/architecture as an extra resource. Build it first:

```bash
cd native/printbridge
cargo build --release
pnpm --filter @thermalbridge/desktop build
```

Do not ship vendor `rastertoX4` filters, OEM DLLs, or driver installers.

Production signing (Developer ID / notarization / Authenticode) is required before public distribution and is not a blocker for internal alpha builds.
