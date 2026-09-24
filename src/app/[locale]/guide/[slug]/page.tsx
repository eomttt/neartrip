import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/common/i18n/locale';
import { StructuredData } from '@/common/seo/components/StructuredData';
import { pageMetadata, siteOrigin, socialImage } from '@/common/seo/site-metadata';
import { destinationGuides, guideLabels } from '@/domains/trip/content/destination-guides';

export const dynamicParams = false;

export function generateStaticParams() {
  return destinationGuides.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/guide/[slug]'>): Promise<Metadata> {
  const { locale, slug } = await params;
  const guide = destinationGuides.find((item) => item.slug === slug);
  if (!isLocale(locale) || !guide) notFound();
  const copy = guide.copy[locale];
  return pageMetadata({
    locale,
    path: `/guide/${slug}`,
    title: `${copy.title} | neartrip`,
    description: copy.description,
    type: 'article',
  });
}

export default async function DestinationGuidePage({
  params,
}: PageProps<'/[locale]/guide/[slug]'>) {
  const { locale, slug } = await params;
  const guide = destinationGuides.find((item) => item.slug === slug);
  if (!isLocale(locale) || !guide) notFound();
  const copy = guide.copy[locale];
  const labels = guideLabels[locale];
  const url = `${siteOrigin}/${locale}/guide/${slug}`;
  return (
    <main className="mx-auto max-w-3xl space-y-10 px-6 py-10 text-foreground">
      <StructuredData
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Article',
              headline: copy.title,
              description: copy.description,
              inLanguage: locale,
              mainEntityOfPage: url,
              image: socialImage,
              datePublished: guide.published,
              dateModified: guide.updated,
              author: {
                '@type': 'Organization',
                name: labels.author,
                url: `${siteOrigin}/${locale}`,
              },
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: labels.planner,
                  item: `${siteOrigin}/${locale}`,
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: labels.guide,
                  item: `${siteOrigin}/${locale}/guide`,
                },
                { '@type': 'ListItem', position: 3, name: copy.title, item: url },
              ],
            },
          ],
        }}
      />
      <nav
        aria-label={locale === 'en' ? 'Breadcrumb' : '현재 위치'}
        className="flex flex-wrap gap-2 text-sm text-primary"
      >
        <a href={`/${locale}`} className="underline underline-offset-4">
          {labels.planner}
        </a>
        <span aria-hidden="true">/</span>
        <a href={`/${locale}/guide`} className="underline underline-offset-4">
          {labels.guide}
        </a>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-muted-foreground">
          {copy.title}
        </span>
      </nav>
      <article className="space-y-10">
        <header className="space-y-4">
          <p className="text-sm font-semibold text-primary">{labels.title}</p>
          <h1 className="text-3xl font-bold leading-snug">{copy.title}</h1>
          <p className="text-base leading-8 text-muted-foreground">{copy.introduction}</p>
          <p className="text-xs text-muted-foreground">
            {labels.author} · {labels.updated}{' '}
            <time dateTime={guide.updated}>
              {new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
                new Date(guide.updated),
              )}
            </time>
          </p>
          <a
            href={`/${locale}`}
            className="inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {labels.action}
          </a>
        </header>
        <nav aria-label={labels.contents} className="space-y-3 rounded-xl bg-secondary p-6">
          <h2 className="font-semibold">{labels.contents}</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-7">
            {copy.sections.map((section) => (
              <li key={section.id}>
                <a className="text-primary underline underline-offset-4" href={`#${section.id}`}>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        {copy.sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-6 space-y-4">
            <h2 className="text-xl font-semibold">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-base leading-8">
                {paragraph}
              </p>
            ))}
            {section.sourceUrl ? (
              <a
                href={section.sourceUrl}
                className="inline-block text-sm text-primary underline underline-offset-4"
              >
                {labels.source}
              </a>
            ) : null}
          </section>
        ))}
        <section className="space-y-4 rounded-xl bg-secondary p-6">
          <h2 className="text-xl font-semibold">{labels.checklist}</h2>
          <ul className="list-disc space-y-3 pl-5 text-sm leading-7">
            {copy.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </article>
      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="text-xl font-semibold">{labels.action}</h2>
        <p className="text-sm leading-7 text-muted-foreground">{labels.actionDescription}</p>
        <a
          href={`/${locale}`}
          className="inline-block font-semibold text-primary underline underline-offset-4"
        >
          {labels.action} →
        </a>
      </section>
      <footer className="space-y-4 border-t border-border pt-6">
        <h2 className="font-semibold">{labels.related}</h2>
        <ul className="space-y-3 text-sm text-primary underline underline-offset-4">
          <li>
            <a href={`/${locale}/guide`}>{labels.guide}</a>
          </li>
          {destinationGuides
            .filter((item) => item.slug !== slug)
            .map((item) => (
              <li key={item.slug}>
                <a href={`/${locale}/guide/${item.slug}`}>{item.copy[locale].title}</a>
              </li>
            ))}
        </ul>
      </footer>
    </main>
  );
}
