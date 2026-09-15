export type Locale = 'ko' | 'en';

export const locales: Locale[] = ['ko', 'en'];
export const defaultLocale: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return value === 'ko' || value === 'en';
}

export function localePath(locale: Locale): string {
  return `/${locale}`;
}
