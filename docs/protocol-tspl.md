# TSPL protocol notes

These are clean-room observations and implementation assumptions. Hardware verification is still required.

## Command stream

```text
SIZE <width> mm,<height> mm
GAP <height> mm,<offset> mm      # or GAP 0,0 / BLINE ...
REFERENCE 0,0
OFFSET <n> mm
DENSITY <n>
SPEED <n>
DIRECTION 0,0
CLS
BITMAP <x>,<y>,<widthBytes>,<height>,1,<binary>
PRINT 1,<copies>
```

Commands use CRLF. The BITMAP payload is raw bytes written immediately after the last comma. It is never Base64 and never passed through a UTF-8 string.

## Bitmap assumptions (unverified)

| Assumption | Value | Status |
| --- | --- | --- |
| Bit order | MSB-first (x=0 → bit 7) | Unverified |
| Black polarity | 1 = black | Unverified |
| TSPL BITMAP mode | 1 | Unverified |
| Row alignment | 1 byte | Unverified |

These live in `DEFAULT_BITMAP_ENCODING`. Do not scatter them through the codebase. After the first physical X4 print, update this table and the profile.

## Media

- Continuous → `GAP 0,0`
- Gap → `GAP <h> mm,<o> mm`
- Black mark → `BLINE <h> mm,<o> mm`
