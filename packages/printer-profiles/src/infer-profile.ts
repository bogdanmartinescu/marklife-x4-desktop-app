import { isPhomemoAdvertisedName } from './ble-names.js';

export interface ProfileHint {
  name: string;
  backend: string;
}

type Detector = (device: ProfileHint) => string | undefined;

function loweredName(device: ProfileHint): string {
  return device.name.trim().toLowerCase();
}

function detectPhomemo(device: ProfileHint): string | undefined {
  if (isPhomemoAdvertisedName(device.name)) {
    return 'phomemo-m110';
  }
  return undefined;
}

function detectD210(device: ProfileHint): string | undefined {
  const name = loweredName(device);
  if (name.startsWith('d210') || name.includes('d210')) {
    return 'marklife-d210';
  }
  return undefined;
}

function detectP50(device: ProfileHint): string | undefined {
  const name = loweredName(device);
  if (name.startsWith('p50') || name.includes('p50')) {
    return 'marklife-p50';
  }
  return undefined;
}

function detectX4(device: ProfileHint): string | undefined {
  const name = loweredName(device);
  if (name.startsWith('x4') || name.startsWith('marklife') || name.includes('x4')) {
    return 'marklife-x4';
  }
  return undefined;
}

function detectCanon(device: ProfileHint): string | undefined {
  if (loweredName(device).includes('canon')) {
    return 'canon-inkjet';
  }
  return undefined;
}

/** First matching detector wins. Add new models here; do not reuse another model's protocol. */
const BLE_DETECTORS: readonly Detector[] = [detectPhomemo, detectD210, detectP50, detectX4];
const OS_QUEUE_DETECTORS: readonly Detector[] = [detectCanon, detectX4, detectD210];

export function inferPrinterProfile(device: ProfileHint): string | undefined {
  const detectors =
    device.backend === 'bluetooth-ble' || device.backend === 'bluetooth-spp'
      ? BLE_DETECTORS
      : device.backend === 'cups' || device.backend === 'windows-spooler'
        ? OS_QUEUE_DETECTORS
        : undefined;
  if (detectors === undefined) {
    return undefined;
  }
  for (const detect of detectors) {
    const profileId = detect(device);
    if (profileId !== undefined) {
      return profileId;
    }
  }
  return undefined;
}
