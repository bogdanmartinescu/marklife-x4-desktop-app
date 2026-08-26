import { MARKLIFE_X4 } from '@thermalbridge/printer-profiles';
import type { DiagnosticRouteId } from '@thermalbridge/printer-profiles';
import type { PrinterBackend } from '@thermalbridge/shared';

export function diagnosticRouteFromDraft(options: {
  profileId: string;
  backend?: PrinterBackend;
  diagnosticTsplOverSpp: boolean;
}): DiagnosticRouteId | undefined {
  if (
    options.diagnosticTsplOverSpp &&
    options.profileId === MARKLIFE_X4.id &&
    options.backend === 'bluetooth-spp'
  ) {
    return 'x4-spp-raw-tspl';
  }
  return undefined;
}
