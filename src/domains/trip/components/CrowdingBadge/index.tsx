import { ChevronDown } from 'lucide-react';
import type { Crowding } from '../../models/model-crowding';
import { isCrowdingFresh } from '../../utils/crowding-freshness';

const colors = {
  여유: 'bg-primary/10 text-primary',
  보통: 'bg-secondary text-secondary-foreground',
  '약간 붐빔': 'bg-warning/10 text-warning',
  붐빔: 'bg-destructive/10 text-destructive',
};
const timeFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
export function CrowdingBadge({ crowding }: { crowding: Crowding }) {
  if (
    crowding.state !== 'available' ||
    !crowding.level ||
    !crowding.areaName ||
    !crowding.observedAt ||
    !isCrowdingFresh(crowding.observedAt)
  ) {
    return null;
  }
  const label = `주변 ${crowding.demo ? '예시 ' : ''}${crowding.level}`;
  const color = colors[crowding.level];
  return (
    <div className="mt-2 text-xs leading-relaxed">
      <details className="group/crowding">
        <summary
          className={`flex w-fit max-w-full cursor-pointer list-none items-center gap-1.5 rounded-md px-2 py-1 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden ${color}`}
          aria-label={`${label} 안내`}
        >
          <span>{label}</span>
          <ChevronDown
            size={14}
            aria-hidden="true"
            className="shrink-0 group-open/crowding:rotate-180"
          />
        </summary>
        <div className="mt-2 ml-2 space-y-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-muted-foreground">
          <p className="whitespace-normal break-words text-xs text-muted-foreground">
            {crowding.demo
              ? '화면 체험용 예시이며 실제 혼잡도가 아니에요.'
              : '주변 구역의 추정 혼잡도예요. 개별 매장의 빈자리나 대기 인원과 달라요.'}
          </p>
          {crowding.replacement ? (
            <p className="whitespace-normal text-xs text-muted-foreground">
              서울시 대체 데이터 기준입니다.
            </p>
          ) : null}
          <a
            className="inline-block underline underline-offset-2"
            href="https://data.seoul.go.kr/dataVisual/seoul/guide.do"
            target="_blank"
            rel="noopener noreferrer"
          >
            출처: 서울 열린데이터광장
          </a>
        </div>
      </details>
      <div className="mt-1 space-y-0.5 text-muted-foreground">
        <div className="font-medium">{crowding.areaName}</div>
        <div>
          <time dateTime={crowding.observedAt}>
            {timeFormat.format(new Date(crowding.observedAt))}
          </time>{' '}
          기준
        </div>
      </div>
    </div>
  );
}
