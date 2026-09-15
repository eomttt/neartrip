import { ChevronDown } from 'lucide-react';
import type { Crowding } from '../../models/model-crowding';
import { isCrowdingFresh } from '../../utils/crowding-freshness';
import { useI18n } from '@/common/i18n/components/I18nProvider';
import { crowdingMessageKeys } from '../../i18n/trip-message-keys';

const colors = {
  여유: 'bg-primary/10 text-primary',
  보통: 'bg-secondary text-secondary-foreground',
  '약간 붐빔': 'bg-warning/10 text-warning',
  붐빔: 'bg-destructive/10 text-destructive',
};
export function CrowdingBadge({ crowding }: { crowding: Crowding }) {
  const { locale, t } = useI18n();
  const { state, areaName, observedAt, level } = crowding;
  if (
    (state !== 'available' && state !== 'stale') ||
    !areaName ||
    !observedAt ||
    (state === 'available' && !level)
  ) {
    return null;
  }
  const delayed = state === 'stale' || !isCrowdingFresh(observedAt);
  const label = delayed
    ? t('crowding.delayed')
    : t('crowding.label', {
        demo: crowding.demo ? t('crowding.demoPrefix') : '',
        level: level ? t(crowdingMessageKeys[level]) : '',
      });
  const color = delayed ? 'bg-warning/10 text-warning' : level ? colors[level] : '';
  const timeFormat = new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return (
    <details className="group/crowding mt-2 text-xs leading-relaxed">
      <summary
        className="flex cursor-pointer list-none items-start gap-2 rounded-lg py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden"
        aria-label={t('crowding.guide', { area: areaName, label })}
      >
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-foreground">{areaName}</span>
          <span
            className={`mt-1 inline-block max-w-full rounded-md px-2 py-1 font-medium ${color}`}
          >
            {label}
          </span>
          <span className="mt-1 block text-muted-foreground">
            {t('crowding.observed', {
              time: timeFormat.format(new Date(observedAt)),
            })}
          </span>
        </span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className="mt-1 shrink-0 group-open/crowding:rotate-180"
        />
      </summary>
      <div className="mt-2 ml-2 space-y-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-muted-foreground">
        <p className="whitespace-normal break-words text-xs text-muted-foreground">
          {delayed
            ? t('crowding.delayedDescription')
            : crowding.demo
              ? t('crowding.demoDescription')
              : t('crowding.description')}
        </p>
        {crowding.replacement ? (
          <p className="whitespace-normal text-xs text-muted-foreground">
            {t('crowding.replacement')}
          </p>
        ) : null}
        <a
          className="inline-block underline underline-offset-2"
          href="https://data.seoul.go.kr/dataVisual/seoul/guide.do"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('crowding.source')}
        </a>
      </div>
    </details>
  );
}
