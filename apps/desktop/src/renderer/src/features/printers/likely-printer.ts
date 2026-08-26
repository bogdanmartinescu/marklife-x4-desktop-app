import { advertisedNameMatches, portNameLooksLikePrinter } from '@thermalbridge/printer-profiles';
import type { PrinterInfo } from '@thermalbridge/shared';

export function isLikelyPrinterName(name: string): boolean {
  return advertisedNameMatches(name) || portNameLooksLikePrinter(name);
}

export function sortLikelyPrintersFirst(devices: PrinterInfo[]): PrinterInfo[] {
  return [...devices].sort((left, right) => {
    const leftScore = isLikelyPrinterName(left.name) || isLikelyPrinterName(left.systemName) ? 0 : 1;
    const rightScore =
      isLikelyPrinterName(right.name) || isLikelyPrinterName(right.systemName) ? 0 : 1;
    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }
    return left.name.localeCompare(right.name);
  });
}
