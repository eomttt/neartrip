import type { MetadataRoute } from 'next';
import { locales } from '@/common/i18n/locale';

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = 'https://neartrip-one.vercel.app';
  return ['', '/guide', '/privacy'].flatMap((path) =>
    locales.map((locale) => ({
      url: `${origin}/${locale}${path}`,
      alternates: { languages: { ko: `${origin}/ko${path}`, en: `${origin}/en${path}` } },
    })),
  );
}
