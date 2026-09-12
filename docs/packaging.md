# Packaging

electron-builder is configured in `apps/desktop/electron-builder.yml`.

Targets:

- Windows x64: NSIS (`ThermalBridge-<version>-win-x64.exe`)
- macOS arm64 (`macos-latest`): DMG + ZIP
- macOS x64 (`macos-13`): DMG + ZIP
- Linux x64 (`ubuntu-22.04`): AppImage + DEB

The packaged app must include the `printbridge` binary for that platform/architecture as an extra resource. Build it first:

```bash
pnpm build
pnpm dist
```

Do not ship vendor `rastertoX4` filters, OEM DLLs, or driver installers.

## Version

Every release must bump the version. `pnpm version:check` fails if:

- workspace `package.json` versions and `native/printbridge/Cargo.toml` disagree
- the git tag is not `v<package version>`
- that version was already released (`v1.2.0` exists, so the next tag is `v1.2.1`)

Bump every workspace package and Cargo.toml together:

```bash
pnpm version:bump 1.2.1
git commit -am "Release 1.2.1"
git tag v1.2.1
git push origin HEAD v1.2.1
```

electron-builder reads `apps/desktop/package.json` and embeds that version in the installer names.

## GitHub Releases

`.github/workflows/release.yml` runs `version:check`, lint, typecheck, coverage (80%), and `cargo test` first. Only then does it build printbridge and package on each OS, verifying the sidecar exists before electron-builder runs.

Unsigned alpha builds are expected until `CSC_LINK` / Apple notarization secrets are added. Production signing (Developer ID / notarization / Authenticode) is required before public distribution and is not a blocker for internal alpha builds.
