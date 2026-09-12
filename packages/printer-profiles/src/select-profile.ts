import { isPhomemoAdvertisedName } from './ble-names.js';
import { inferPrinterProfile } from './infer-profile.js';
import { resolveRoute } from './route-resolver.js';
import type { TransportKind } from './routes.js';

export function profileHasPrintRoute(modelId: string, transport: TransportKind): boolean {
  return resolveRoute({ modelId, transport }).kind === 'resolved';
}

/**
 * Pick a profile that has a print route for this transport.
 * Candidates stay model-specific: X4 is never used as a fallback for Phomemo (or vice versa).
 */
export function selectPrintableProfile(input: {
  transport: TransportKind;
  requestedModelId?: string;
  boundModelId?: string;
  deviceName?: string;
}): string {
  const candidates: string[] = [];
  const push = (id: string | undefined): void => {
    if (id !== undefined && id.length > 0 && !candidates.includes(id)) {
      candidates.push(id);
    }
  };
  push(input.requestedModelId);
  push(input.boundModelId);
  push(
    inferPrinterProfile({
      name: input.deviceName ?? '',
      backend: input.transport,
    }),
  );

  for (const modelId of candidates) {
    if (
      modelId === 'marklife-x4' &&
      input.transport === 'bluetooth-ble' &&
      isPhomemoAdvertisedName(input.deviceName ?? '')
    ) {
      continue;
    }
    if (profileHasPrintRoute(modelId, input.transport)) {
      return modelId;
    }
  }

  return input.requestedModelId ?? input.boundModelId ?? 'marklife-x4';
}
