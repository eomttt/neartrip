import { notFound } from 'next/navigation';
import { isLocale } from '@/common/i18n/locale';
import { TripPage } from '../_components/TripPage';
import { GuideOverview } from '../_components/GuideOverview';
import { getTripConfig } from '../../../server/trip-service';
import { StructuredData } from '@/common/seo/components/StructuredData';
import { homeMetadata, siteOrigin } from '@/common/seo/site-metadata';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <>
      <StructuredData
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebSite',
              '@id': `${siteOrigin}/#website`,
              name: 'neartrip',
              url: siteOrigin,
              inLanguage: ['en', 'ko'],
            },
            {
              '@type': 'WebApplication',
              '@id': `${siteOrigin}/${locale}#planner`,
              name: 'neartrip',
              url: `${siteOrigin}/${locale}`,
              description: homeMetadata[locale].description,
              inLanguage: locale,
              applicationCategory: 'TravelApplication',
              operatingSystem: 'Any',
              browserRequirements: 'Requires JavaScript and an internet connection',
              isAccessibleForFree: true,
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
              isPartOf: { '@id': `${siteOrigin}/#website` },
            },
          ],
        }}
      />
      <TripPage initialConfig={getTripConfig()} />
      <GuideOverview locale={locale} />
    </>
  );
}
