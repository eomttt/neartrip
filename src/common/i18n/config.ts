import type { I18nConfig } from 'next-i18next/proxy';
import { defaultLocale, locales } from './locale';

export const i18nConfig = {
  supportedLngs: locales,
  fallbackLng: defaultLocale,
  localeParamName: 'locale',
  cookieName: 'i18next',
  persistCookie: false,
  i18nextOptions: {
    keySeparator: false,
    interpolation: { prefix: '{', suffix: '}', escapeValue: false },
  },
} satisfies I18nConfig;
