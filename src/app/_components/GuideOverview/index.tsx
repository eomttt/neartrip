import type { Locale } from '@/common/i18n/locale';
import { travelGuide } from '@/domains/trip/content/travel-guide';

export function GuideOverview({ locale }: { locale: Locale }) {
  const copy = travelGuide[locale];
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
        <div className="grid gap-6 md:grid-cols-3">
          {copy.overview.map((item) => (
            <section key={item.title} className="space-y-3">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm leading-7 text-muted-foreground">{item.body}</p>
            </section>
          ))}
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-primary underline underline-offset-4">
          <a href={`/${locale}/guide`}>{copy.read}</a>
          <a href={`/${locale}/privacy`}>{copy.privacy}</a>
        </div>
      </div>
    </section>
  );
}
