import type { Locale } from '@/common/i18n/locale';
import { travelGuide } from '@/domains/trip/content/travel-guide';
import { destinationGuides, guideLabels } from '@/domains/trip/content/destination-guides';

export function GuideOverview({ locale }: { locale: Locale }) {
  const copy = travelGuide[locale];
  const labels = guideLabels[locale];
  return (
    <section
      id="planning-guide"
      aria-labelledby="guide-overview-title"
      className="border-t border-border bg-background px-6 py-12"
    >
      <div className="mx-auto max-w-5xl space-y-7">
        <h2 id="guide-overview-title" className="text-2xl font-bold">
          {copy.overviewTitle}
        </h2>
        <p className="max-w-3xl text-base leading-8 text-muted-foreground">{labels.introduction}</p>
        <div className="grid gap-6 md:grid-cols-3">
          {copy.overview.map((item) => (
            <section key={item.title} className="space-y-3">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm leading-7 text-muted-foreground">{item.body}</p>
            </section>
          ))}
        </div>
        <section className="space-y-5">
          <h2 className="text-xl font-semibold">{labels.title}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {destinationGuides.map((guide) => (
              <a
                key={guide.slug}
                href={`/${locale}/guide/${guide.slug}`}
                className="space-y-3 rounded-xl border border-border bg-card p-6 transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary"
              >
                <h3 className="font-semibold text-primary underline underline-offset-4">
                  {guide.copy[locale].title}
                </h3>
                <p className="text-sm leading-7 text-muted-foreground">
                  {guide.copy[locale].description}
                </p>
              </a>
            ))}
          </div>
        </section>
        <section className="space-y-5">
          <h2 className="text-xl font-semibold">{labels.faqTitle}</h2>
          {labels.questions.map((item) => (
            <div key={item.question} className="space-y-2">
              <h3 className="font-semibold">{item.question}</h3>
              <p className="text-sm leading-7 text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </section>
        <div className="flex flex-wrap gap-6 text-sm text-primary underline underline-offset-4">
          <a href={`/${locale}/guide`}>{copy.read}</a>
          <a href={`/${locale}/privacy`}>{copy.privacy}</a>
        </div>
      </div>
    </section>
  );
}
