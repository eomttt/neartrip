import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/common/i18n/locale';
import { travelGuide } from '@/domains/trip/content/travel-guide';
import { destinationGuides, guideLabels } from '@/domains/trip/content/destination-guides';
import { pageMetadata, siteOrigin, socialImage } from '@/common/seo/site-metadata';
import { StructuredData } from '@/common/seo/components/StructuredData';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/guide'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = travelGuide[locale];
  return pageMetadata({
    locale,
    path: '/guide',
    title: `${copy.title} | neartrip`,
    description: copy.description,
    type: 'article',
  });
}

export default async function GuidePage({ params }: PageProps<'/[locale]/guide'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = travelGuide[locale];
  const labels = guideLabels[locale];
  const adsEnabled =
    process.env.NODE_ENV === 'production' &&
    process.env.VERCEL_ENV !== 'preview' &&
    process.env.ADSENSE_ENABLED !== 'false';
  return (
    <>
      <StructuredData
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: copy.title,
          description: copy.description,
          inLanguage: locale,
          mainEntityOfPage: `${siteOrigin}/${locale}/guide`,
          image: socialImage,
          datePublished: '2026-09-22',
          dateModified: '2026-09-24',
          author: { '@type': 'Organization', name: 'neartrip', url: `${siteOrigin}/${locale}` },
        }}
      />
      <main className="mx-auto max-w-3xl space-y-10 px-6 py-10 text-foreground">
        <a href={`/${locale}`} className="text-sm text-primary underline underline-offset-4">
          ← {copy.start}
        </a>
        <article className="space-y-10">
          <header className="space-y-4">
            <p className="text-sm font-semibold text-primary">{copy.label}</p>
            <h1 className="text-3xl font-bold leading-snug">{copy.title}</h1>
            <p className="leading-7 text-muted-foreground">{copy.description}</p>
            <p className="text-xs text-muted-foreground">
              {copy.author} · {copy.updated}
            </p>
          </header>
          {copy.sections.map((section) => (
            <section key={section.title} className="space-y-4">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-base leading-8">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
          <section className="space-y-4 rounded-xl bg-secondary p-6">
            <h2 className="text-xl font-semibold">{copy.checklistTitle}</h2>
            <ul className="list-disc space-y-3 pl-5 text-sm leading-7">
              {copy.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </article>
        <section className="space-y-5">
          <h2 className="text-xl font-semibold">{labels.related}</h2>
          {destinationGuides.map((guide) => (
            <div key={guide.slug} className="space-y-2 rounded-xl border border-border p-5">
              <h3>
                <a
                  href={`/${locale}/guide/${guide.slug}`}
                  className="font-semibold text-primary underline underline-offset-4"
                >
                  {guide.copy[locale].title}
                </a>
              </h3>
              <p className="text-sm leading-7 text-muted-foreground">
                {guide.copy[locale].description}
              </p>
            </div>
          ))}
        </section>
        <footer className="flex flex-wrap gap-6 border-t border-border pt-6 text-sm text-primary underline underline-offset-4">
          <a href={`/${locale}`}>{copy.start}</a>
          <a href={`/${locale}/privacy`}>{copy.privacy}</a>
        </footer>
      </main>
      {adsEnabled ? (
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9152190009267204"
          crossOrigin="anonymous"
        />
      ) : null}
    </>
  );
}
