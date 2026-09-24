import type { Metadata } from 'next';
import type { Locale } from '@/common/i18n/locale';

export const siteOrigin = 'https://neartrip-one.vercel.app';
export const socialImage = `${siteOrigin}/og-neartrip-v1.jpg`;

export const homeMetadata = {
  en: {
    title: 'Korea Trip Planner: Explore Near Your Hotel | neartrip',
    description:
      'Plan a day in Korea from your hotel. Find nearby restaurants, cafés and sights with Google ratings, choose up to 5 stops, and open NAVER or Google Maps directions.',
  },
  ko: {
    title: '한국 여행 동선 만들기 · 숙소 주변 맛집과 명소 | neartrip',
    description:
      '숙소 주변 맛집·카페·명소를 Google 별점과 함께 살펴보세요. 최대 5곳의 방문 순서를 정하고 네이버 지도나 Google Maps에서 실제 길찾기를 열 수 있습니다.',
  },
};

export function localizedAlternates(path: string) {
  return {
    ko: `${siteOrigin}/ko${path}`,
    en: `${siteOrigin}/en${path}`,
    'x-default': `${siteOrigin}/en${path}`,
  };
}

export function pageMetadata({
  locale,
  path,
  title,
  description,
  type = 'website',
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  type?: 'website' | 'article';
}): Metadata {
  const url = `${siteOrigin}/${locale}${path}`;
  const image = {
    url: socialImage,
    width: 1200,
    height: 630,
    alt: locale === 'en' ? 'neartrip Korea day trip planner' : 'neartrip 한국 하루 여행 계획',
  };
  return {
    title,
    description,
    alternates: { canonical: url, languages: localizedAlternates(path) },
    openGraph: {
      type,
      url,
      title,
      description,
      siteName: 'neartrip',
      locale: locale === 'ko' ? 'ko_KR' : 'en_US',
      alternateLocale: locale === 'ko' ? 'en_US' : 'ko_KR',
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}
