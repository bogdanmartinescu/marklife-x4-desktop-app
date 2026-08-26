import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import {
  interpolate,
  messages,
  type Locale,
  type MessageKey,
} from './messages.js';

interface I18nValue {
  locale: Locale;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider(props: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  children: ReactNode;
}) {
  const t = useCallback((key: MessageKey, vars?: Record<string, string | number>): string => {
    const table = messages[props.locale] ?? messages.ro;
    return interpolate(table[key], vars);
  }, [props.locale]);

  const value = useMemo(
    () => ({ locale: props.locale, t, setLocale: props.setLocale }),
    [props.locale, t, props.setLocale],
  );

  return <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return value;
}
