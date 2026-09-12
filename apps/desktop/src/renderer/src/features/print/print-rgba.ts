import { getProfile, MARKLIFE_X4, profileColorModel } from '@thermalbridge/printer-profiles';
import { invertRgba, prepareInkjetRgba } from '@thermalbridge/thermal-core';

/** X4 firmware prints the opposite of on-screen polarity. History PNGs stay uninverted. */
export function printRgbaForProfile(profileId: string, rgba: Uint8Array): Uint8Array {
  if (profileId === MARKLIFE_X4.id) {
    return invertRgba(rgba);
  }
  const profile = getProfile(profileId);
  if (profile !== undefined && profileColorModel(profile) === 'inkjet-cmyk') {
    return prepareInkjetRgba(rgba);
  }
  return rgba;
}
