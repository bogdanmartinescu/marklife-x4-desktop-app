# Testing

## CI

Push and pull-request builds run `.github/workflows/test.yml` (`pnpm version:check`, lint, typecheck, `pnpm test:coverage`, `cargo test`). Version tags run the same gate in `.github/workflows/release.yml` before packaging.

Coverage thresholds are 80% lines / functions / statements (70% branches) on `thermal-core`, `printer-profiles`, `shared`, and the desktop logic modules.

## Unit tests

```bash
pnpm test
```

Byte-level coverage:

- `mmToDots(100, 203) === 799`
- packBits 8×1 / 16×1 / 8×8 checkerboard
- BinaryWriter text/binary interleaving
- TsplJobBuilder golden job with a BITMAP payload
- grayscale / threshold / Floyd–Steinberg
- Marklife X4 `density.default === 14`
- Menu registry completeness (every `MenuActionId` has EN/RO labels)
- `registerAccelerator` never true for a modifier-free shortcut
- `buildMenuTemplate` structure, radios, disabled states, macOS vs Windows
- Command handler map covers every `MenuActionId`

## printbridge

```bash
cd native/printbridge
cargo test
```

Covers NDJSON parse, unknown methods, and job-path rejection.

## CLI

```bash
pnpm label:build -- --input ./label.png --size 100x150 --profile marklife-x4 --output ./job.prn
```

## Hardware

Phase 8 is not automated. Follow README §33 and record results in `protocol-tspl.md`.
