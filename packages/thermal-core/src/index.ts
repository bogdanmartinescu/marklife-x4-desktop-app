export { mmToDots, dotsToMm, type Millimeters, type Dots, type Dpi } from './geometry/units.js';
export { computeFitRect, type Rect } from './geometry/fit.js';

export {
  DEFAULT_BITMAP_ENCODING,
  X4_BITMAP_ENCODING,
  type RgbaImage,
  type MonoBitmap,
  type BitmapEncoding,
  type BitOrder,
  type DitherMode,
} from './bitmap/types.js';
export { packBits } from './bitmap/pack-bits.js';
export { rgbaToGrayscale } from './bitmap/grayscale.js';
export { applyThreshold } from './bitmap/threshold.js';
export { floydSteinberg } from './bitmap/floyd-steinberg.js';
export { resizeNearest } from './bitmap/resize.js';
export {
  rotate90,
  rotate180,
  rotate270,
  rotateBy,
  type RotatedGray,
} from './bitmap/rotate.js';
export { mirrorX, mirrorY } from './bitmap/mirror.js';
export { negateThreshold } from './bitmap/negative.js';
export { invertRgba } from './bitmap/invert-rgba.js';
export { isBelowPrintResolution } from './bitmap/print-resolution.js';
export { enhanceDocumentRgba } from './bitmap/enhance-document.js';
export {
  applyInkjetCmyk,
  cmykToRgb,
  prepareInkjetRgba,
  rgbToCmyk,
  type Cmyk,
  type Rgb,
} from './bitmap/cmyk.js';
export { buildPrintJob, type BuildPrintJobOptions } from './bitmap/build-print-job.js';

export { BinaryWriter } from './languages/tspl/encoder.js';
export {
  sizeCommand,
  gapCommand,
  continuousCommand,
  blineCommand,
  encodeMedia,
  referenceCommand,
  offsetCommand,
  densityCommand,
  speedCommand,
  directionCommand,
  clearCommand,
  printCommand,
} from './languages/tspl/commands.js';
export { TsplJobBuilder, type BitmapCommandOptions } from './languages/tspl/job-builder.js';
export {
  X4_BT_GRAYSCALE_PARAMETER,
  ProtocolUnimplementedError,
  applyX4BluetoothThreshold,
  encodeX4BluetoothJob,
  type X4BluetoothJobInput,
} from './languages/marklife/x4-bluetooth/encoder.js';
export {
  PHOMEMO_M110_BYTES_PER_LINE,
  PHOMEMO_M110_WIDTH_PX,
  buildPhomemoM110Job,
  encodePhomemoM110Commands,
  placeOnPhomemoHead,
  type BuildPhomemoM110JobOptions,
  type PhomemoM110CommandOptions,
} from './languages/escpos/phomemo-m110.js';
export {
  X4_BLUETOOTH_HEADER_FIELDS,
  type X4BluetoothHeaderInput,
  type X4BluetoothHeaderFieldStatus,
} from './languages/marklife/x4-bluetooth/header.js';
export {
  BitmapEncodingSchema,
  MediaSettingsSchema,
  TsplJobOptionsSchema,
  defaultBitmapEncoding,
  type MediaSettings,
  type TsplJobOptions,
} from './languages/tspl/types.js';

export {
  DEFAULT_LABEL_TRANSFORM,
  type LabelTransform,
  type FitMode,
  type Rotation,
} from './jobs/types.js';
