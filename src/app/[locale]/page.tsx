import { notFound } from 'next/navigation';
import { isLocale } from '@/common/i18n/locale';
import { TripPage } from '../_components/TripPage';

export default async function Page({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <TripPage />;
}
