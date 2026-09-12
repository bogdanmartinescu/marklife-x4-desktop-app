# Testing

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
