'use client';

import { useMemo, type ReactNode } from 'react';
import { I18nProvider as NextI18nProvider, useT } from 'next-i18next/client';
import { i18nConfig } from '../../config';
import { defaultLocale, isLocale, type Locale } from '../../locale';
import { resources, type MessageKey, type MessageValues } from '../../messages';

interface I18nContextValue {
  locale: Locale;
  t: (key: MessageKey, values?: MessageValues) => string;
}

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  return (
    <NextI18nProvider
      language={initialLocale}
      supportedLngs={i18nConfig.supportedLngs}
      fallbackLng={i18nConfig.fallbackLng}
      resources={resources}
      i18nextOptions={i18nConfig.i18nextOptions}
    >
      {children}
    </NextI18nProvider>
  );
}

export function useI18n(): I18nContextValue {
  const { i18n, t } = useT();
  const locale = isLocale(i18n.language) ? i18n.language : defaultLocale;
  return useMemo(
    () => ({ locale, t: (key: MessageKey, values?: MessageValues) => t(key, values) }),
    [locale, t],
  );
}
