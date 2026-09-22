import { notFound } from 'next/navigation';
import { isLocale } from '@/common/i18n/locale';
import { TripPage } from '../_components/TripPage';
import { GuideOverview } from '../_components/GuideOverview';
import { getTripConfig } from '../../../server/trip-service';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <>
      <TripPage initialConfig={getTripConfig()} />
      <GuideOverview locale={locale} />
    </>
  );
}
