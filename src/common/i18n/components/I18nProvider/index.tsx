'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { localePath, type Locale } from '../../locale';
import { translate, type MessageKey, type MessageValues } from '../../messages';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, values?: MessageValues) => string;
}

const defaultContext: I18nContextValue = {
  locale: 'ko',
  setLocale: () => {},
  t: (key, values) => translate('ko', key, values),
};

const I18nContext = createContext<I18nContextValue>(defaultContext);

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setCurrentLocale] = useState(initialLocale);
  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale(nextLocale) {
        setCurrentLocale(nextLocale);
        document.documentElement.lang = nextLocale;
        document.title = translate(nextLocale, 'metadata.title');
        const description = document.querySelector('meta[name="description"]');
        description?.setAttribute('content', translate(nextLocale, 'metadata.description'));
        window.history.replaceState(window.history.state, '', localePath(nextLocale));
      },
      t: (key, values) => translate(locale, key, values),
    }),
    [locale],
  );
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
