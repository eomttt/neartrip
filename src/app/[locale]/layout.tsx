import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import '@/common/design-system/shadcn.css';
import '@/common/design-system/global.css';
import { I18nProvider } from '@/common/i18n/components/I18nProvider';
import { isLocale, locales } from '@/common/i18n/locale';
import { QueryProvider } from '@/common/react-query/components/QueryProvider';
import { homeMetadata, pageMetadata, siteOrigin } from '@/common/seo/site-metadata';

const adsenseClientId = 'ca-pub-9152190009267204';

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#245d46' };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return {
    ...pageMetadata({ locale, path: '', ...homeMetadata[locale] }),
    metadataBase: new URL(siteOrigin),
    applicationName: 'neartrip',
    verification: { google: 'Zz-agMVeFOlHDY0QZ4oSsv6f1Vv-vDMamA8i0daryQg' },
    other: { 'google-adsense-account': adsenseClientId },
    robots: process.env.VERCEL_ENV === 'preview' ? { index: false, follow: false } : undefined,
    icons: { icon: '/favicon.svg' },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale}>
      <body>
        <I18nProvider initialLocale={locale}>
          <QueryProvider>{children}</QueryProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
