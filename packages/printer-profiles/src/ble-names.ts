/**
 * BLE advertised-name prefixes, matching thermoprint's discover() method:
 * first prefix that the local name starts with wins.
 * @see https://github.com/tomLadder/thermoprint
 */
export const BLE_NAME_PREFIXES: readonly string[] = [
  'Marklife',
  'X4',
  'D210',
  'P50',
  'P80',
  'P15R',
  'P15S',
  'P15',
  'P12',
  'P7',
  'M60',
  'P1s',
  'LP15',
  'S15',
  'S12',
  'U4',
  'D100',
  'D200',
  '210',
];

export function advertisedNameMatches(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return false;
  }
  return BLE_NAME_PREFIXES.some((prefix) =>
    trimmed.toLowerCase().startsWith(prefix.toLowerCase()),
  );
}

export function portNameLooksLikePrinter(name: string): boolean {
  const lowered = name.toLowerCase();
  if (isHostIncomingPort(lowered)) {
    return false;
  }
  return (
    advertisedNameMatches(name) ||
    BLE_NAME_PREFIXES.some((prefix) => lowered.includes(prefix.toLowerCase())) ||
    lowered.includes('rfcomm') ||
    lowered.includes('-serial')
  );
}

export function isHostIncomingPort(name: string): boolean {
  const lowered = name.toLowerCase();
  return (
    lowered.includes('incoming-port') ||
    lowered.includes('incomingport') ||
    lowered.includes('bluetooth-incoming')
  );
}
