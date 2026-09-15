import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import '@/common/design-system/shadcn.css';
import '@/common/design-system/global.css';
import { I18nProvider } from '@/common/i18n/components/I18nProvider';
import { isLocale, locales } from '@/common/i18n/locale';
import { QueryProvider } from '@/common/react-query/components/QueryProvider';

const metadataByLocale = {
  ko: {
    title: '가까이 · neartrip | 오늘, 어디 가지?',
    description: '숙소 근처의 맛집·카페·가볼 만한 곳·술집을 골라 오늘의 여행 동선을 만들어보세요.',
    alt: '가까이 neartrip — 숙소와 카페, 맛집과 산책길을 잇는 여행 동선',
  },
  en: {
    title: 'neartrip | Plan a day around your stay in Korea',
    description:
      'Pick food, cafés, sights, and drinks near your hotel, then turn them into a route for today.',
    alt: 'neartrip connects a hotel, café, restaurant, and walking path into one day route in Korea',
  },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#245d46' };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = metadataByLocale[locale];
  const image = { url: '/og-neartrip-v1.jpg', width: 1200, height: 630, alt: copy.alt };
  return {
    metadataBase: new URL('https://neartrip-one.vercel.app'),
    title: copy.title,
    description: copy.description,
    applicationName: 'neartrip',
    alternates: {
      canonical: `/${locale}`,
      languages: { ko: '/ko', en: '/en', 'x-default': '/en' },
    },
    openGraph: {
      type: 'website',
      locale: locale === 'ko' ? 'ko_KR' : 'en_US',
      url: `/${locale}`,
      siteName: 'neartrip',
      title: copy.title,
      description: copy.description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.title,
      description: copy.description,
      images: [image],
    },
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
