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

/** First matching detector wins. Add new models here; do not reuse another model's protocol. */
const DETECTORS: readonly Detector[] = [detectPhomemo, detectD210, detectP50, detectX4];

export function inferPrinterProfile(device: ProfileHint): string | undefined {
  if (device.backend !== 'bluetooth-ble' && device.backend !== 'bluetooth-spp') {
    return undefined;
  }
  for (const detect of DETECTORS) {
    const profileId = detect(device);
    if (profileId !== undefined) {
      return profileId;
    }
  }
  return undefined;
}
