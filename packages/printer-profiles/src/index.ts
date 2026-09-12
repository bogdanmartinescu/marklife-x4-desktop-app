import { CANON_INKJET } from './profiles/canon-inkjet.js';
import { GENERIC_TSPL_203 } from './profiles/generic-tspl-203.js';
import { MARKLIFE_D210 } from './profiles/marklife-d210.js';
import { MARKLIFE_P50 } from './profiles/marklife-p50.js';
import { MARKLIFE_X4 } from './profiles/marklife-x4.js';
import { PHOMEMO_M110 } from './profiles/phomemo-m110.js';
import { PrinterProfileSchema, type PrinterProfile } from './schema.js';

export {
  PrinterProfileSchema,
  DEFAULT_LABEL_SIZES,
  LABEL_MM_MAX,
  LABEL_MM_MIN,
  clampLabelMm,
  printableWidthMm,
  labelSizeKey,
  labelSizeRecord,
  parseLabelSizeKey,
  type LabelSize,
  type LabelSizeGroup,
  type PrinterProfile,
} from './schema.js';
export {
  X4_BLE_PRINTER_RX_CHAR_UUID,
  X4_BLE_PRINTER_SERVICE_UUID,
  X4_BLE_PRINTER_TX_CHAR_UUID,
  x4BleWriteTarget,
} from './x4-ble.js';
export { CANON_INKJET } from './profiles/canon-inkjet.js';
export { MARKLIFE_X4 } from './profiles/marklife-x4.js';
export { MARKLIFE_D210 } from './profiles/marklife-d210.js';
export { MARKLIFE_P50 } from './profiles/marklife-p50.js';
export { PHOMEMO_M110 } from './profiles/phomemo-m110.js';
export { GENERIC_TSPL_203 } from './profiles/generic-tspl-203.js';
export { resolveRoute } from './route-resolver.js';
export { inferPrinterProfile } from './infer-profile.js';
export { profileHasPrintRoute, selectPrintableProfile } from './select-profile.js';
export {
  applyProfilePrintSettings,
  labelSizesForMaxWidth,
  labelSizesForProfile,
  profileColorModel,
  profileDefaultPrintSettings,
  profileUsesMediaDimensions,
  type MediaMode,
  type ProfileDefaultPrintSettings,
  type ProfilePrintSettings,
} from './print-options.js';
export {
  applyD210PrintSettings,
  clampD210FeedMm,
  D210_FEED_MM_MAX,
  D210_FEED_MM_MIN,
  D210_MEDIA_TYPES,
  D210_PROCESSING_MODES,
  DEFAULT_D210_PRINT_SETTINGS,
  isD210ContinuousMedia,
  isD210LabelMedia,
  type D210MediaType,
  type D210PrintSettings,
  type D210Processing,
} from './d210-options.js';
export {
  advertisedNameMatches,
  BLE_NAME_PREFIXES,
  isHostIncomingPort,
  isPhomemoAdvertisedName,
  looksLikePhomemoSerial,
  portNameLooksLikePrinter,
} from './ble-names.js';
export type {
  CodecId,
  DiagnosticRouteId,
  PrinterRoute,
  ProtocolId,
  ResolveRouteInput,
  ResolveRouteResult,
  RouteStatus,
  SessionProfileId,
  TransportKind,
} from './routes.js';

export const PROFILES: readonly PrinterProfile[] = [
  MARKLIFE_X4,
  CANON_INKJET,
  MARKLIFE_D210,
  MARKLIFE_P50,
  PHOMEMO_M110,
  GENERIC_TSPL_203,
];

export function getProfile(id: string): PrinterProfile | undefined {
  return PROFILES.find((profile) => profile.id === id);
}

export function requireProfile(id: string): PrinterProfile {
  const profile = getProfile(id);
  if (!profile) {
    throw new Error(`Unknown printer profile: ${id}`);
  }
  return PrinterProfileSchema.parse(profile);
}
