import type { MetadataRoute } from 'next';
import { locales } from '@/common/i18n/locale';
import { localizedAlternates, siteOrigin } from '@/common/seo/site-metadata';
import { destinationGuides } from '@/domains/trip/content/destination-guides';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: '', updated: '2026-09-24' },
    { path: '/guide', updated: '2026-09-24' },
    { path: '/privacy', updated: '2026-09-24' },
    ...destinationGuides.map((guide) => ({ path: `/guide/${guide.slug}`, updated: guide.updated })),
  ];
  return pages.flatMap(({ path, updated }) =>
    locales.map((locale) => ({
      url: `${siteOrigin}/${locale}${path}`,
      lastModified: updated,
      alternates: { languages: localizedAlternates(path) },
    })),
  );
}
