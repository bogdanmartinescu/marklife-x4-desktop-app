import {
  FIT_MODES,
  LOCALES,
  SCREENS,
  type Locale,
  type MenuFitMode,
  type Screen,
} from '@thermalbridge/shared';

export function asString(payload: unknown): string | null {
  return typeof payload === 'string' && payload.length > 0 ? payload : null;
}

export function asScreen(payload: unknown): Screen | null {
  return typeof payload === 'string' && (SCREENS as readonly string[]).includes(payload)
    ? (payload as Screen)
    : null;
}

export function asLocale(payload: unknown): Locale | null {
  return typeof payload === 'string' && (LOCALES as readonly string[]).includes(payload)
    ? (payload as Locale)
    : null;
}

export function asFitMode(payload: unknown): MenuFitMode | null {
  return typeof payload === 'string' && (FIT_MODES as readonly string[]).includes(payload)
    ? (payload as MenuFitMode)
    : null;
}

export function asLabelSize(payload: unknown): { widthMm: number; heightMm: number } | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const record = payload as Record<string, unknown>;
  if (typeof record['widthMm'] !== 'number' || typeof record['heightMm'] !== 'number') {
    return null;
  }
  if (!(record['widthMm'] > 0) || !(record['heightMm'] > 0)) {
    return null;
  }
  return { widthMm: record['widthMm'], heightMm: record['heightMm'] };
}
