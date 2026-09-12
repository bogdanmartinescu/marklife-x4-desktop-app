import { advertisedNameMatches, portNameLooksLikePrinter } from '@thermalbridge/printer-profiles';
import type { PrinterInfo } from '@thermalbridge/shared';

export function isLikelyPrinterName(name: string): boolean {
  return (
    advertisedNameMatches(name) ||
    portNameLooksLikePrinter(name) ||
    name.toLowerCase().includes('canon')
  );
}

function rssiRank(device: PrinterInfo): number {
  return device.rssi ?? Number.NEGATIVE_INFINITY;
}

export function sortLikelyPrintersFirst(devices: PrinterInfo[]): PrinterInfo[] {
  return [...devices].sort((left, right) => {
    const leftScore = isLikelyPrinterName(left.name) || isLikelyPrinterName(left.systemName) ? 0 : 1;
    const rightScore =
      isLikelyPrinterName(right.name) || isLikelyPrinterName(right.systemName) ? 0 : 1;
    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }
    const rssiDelta = rssiRank(right) - rssiRank(left);
    if (rssiDelta !== 0) {
      return rssiDelta;
    }
    return left.name.localeCompare(right.name);
  });
}
