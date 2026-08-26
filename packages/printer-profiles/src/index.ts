import { GENERIC_TSPL_203 } from './profiles/generic-tspl-203.js';
import { MARKLIFE_D210 } from './profiles/marklife-d210.js';
import { MARKLIFE_P50 } from './profiles/marklife-p50.js';
import { MARKLIFE_X4 } from './profiles/marklife-x4.js';
import { PrinterProfileSchema, type PrinterProfile } from './schema.js';

export {
  PrinterProfileSchema,
  DEFAULT_LABEL_SIZES,
  LABEL_MM_MAX,
  LABEL_MM_MIN,
  clampLabelMm,
  labelSizeKey,
  labelSizeRecord,
  parseLabelSizeKey,
  type PrinterProfile,
} from './schema.js';
export { MARKLIFE_X4 } from './profiles/marklife-x4.js';
export { MARKLIFE_D210 } from './profiles/marklife-d210.js';
export { MARKLIFE_P50 } from './profiles/marklife-p50.js';
export { GENERIC_TSPL_203 } from './profiles/generic-tspl-203.js';
export { resolveRoute } from './route-resolver.js';
export {
  advertisedNameMatches,
  BLE_NAME_PREFIXES,
  isHostIncomingPort,
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
  MARKLIFE_D210,
  MARKLIFE_P50,
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
