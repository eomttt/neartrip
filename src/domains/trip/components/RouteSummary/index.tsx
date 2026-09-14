import './style.css';
import { useId, useState } from 'react';
import { Button } from '@/common/design-system/components/Button';
import {
  Bus,
  ExternalLink,
  CircleCheck,
  ChevronDown,
  TriangleAlert,
  Footprints,
  House,
  Flag,
  MapPin,
  TrainFront,
} from 'lucide-react';
import type { Itinerary, Place } from '../../models/model-trip';
import { formatDistance, formatMinutes } from '../../utils/route-order';
import { getKakaoRouteUrl } from '../../utils/kakao-route-url';

interface Props {
  activeRoute?: { legIndex: number; segmentIndex: number | null } | null;
  onFocusRoute: (legIndex: number, segmentIndex: number | null) => void;
  origin: Place | null;
  destination: Place | null;
  itinerary: Itinerary | null;
  onEdit: () => void;
}

export function RouteSummary({
  activeRoute,
  onFocusRoute,
  origin,
  destination,
  itinerary,
  onEdit,
}: Props) {
  const detailsId = useId();
  const [disclosure, setDisclosure] = useState<{ itinerary: Itinerary; closed: number[] } | null>(
    null,
  );
  const closedLegs = disclosure?.itinerary === itinerary ? (disclosure?.closed ?? []) : [];
  const segments = itinerary?.legs.flatMap((leg) => leg.segments) ?? [];
  const hasWarnings = itinerary?.legs.some((leg) => leg.warning) ?? false;
  const totalSeconds = segments.reduce((sum, segment) => sum + segment.seconds, 0);
  const totalMeters = segments.reduce((sum, segment) => sum + segment.meters, 0);
  return (
    <section className="route-panel" aria-labelledby="route-title">
      <div className="section-heading">
        <h2 id="route-title">이동 안내</h2>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          장소·순서 수정
        </Button>
      </div>
      <div className="route-start">
        <House size={14} />
        <span>{origin?.name}</span>
        <small>출발</small>
      </div>
      <div className="route-start">
        <Flag size={14} />
        <span>{destination?.name ?? origin?.name}</span>
        <small>{destination ? '도착' : '돌아오기'}</small>
      </div>
      {itinerary ? (
        <div className={`route-result ${hasWarnings ? 'route-incomplete' : ''}`} aria-live="polite">
          <div className="route-result-title">
            {hasWarnings ? <TriangleAlert size={17} /> : <CircleCheck size={17} />}
            <strong>
              {hasWarnings
                ? '동선을 만들었어요 · 주의 구간 포함'
                : itinerary.demo
                  ? '예시 동선을 만들었어요'
                  : '오늘의 동선이 준비됐어요'}
            </strong>
          </div>
          <p>
            {hasWarnings ? '표시된 경로 합산 · ' : '이동만 · '}
            {totalSeconds ? formatMinutes(totalSeconds) : '0분'}
            <span>·</span>
            {formatDistance(totalMeters)}
            {itinerary.demo ? ' · 추정치' : ''}
          </p>
          <h3 className="route-details-title">구간별 이동</h3>
          <div
            className="route-details-scroll"
            role="region"
            aria-label="구간별 이동 안내"
            tabIndex={0}
          >
            <p className="route-detail-hint">이동 안내를 누르면 표시점이 경로를 따라 움직여요.</p>
            {itinerary.legs.map((leg, index) => {
              const isOpen = !closedLegs.includes(index);
              const legDetailsId = `${detailsId}-${index}`;
              return (
                <div className="leg" key={`${leg.from.id}-${leg.to.id}`}>
                  <div className="flex items-start gap-1">
                    <Button
                      variant="ghost"
                      className="route-leg-trigger h-auto min-w-0 flex-1 justify-start whitespace-normal px-2 py-2 text-left text-xs"
                      aria-label={`${index + 1}. ${leg.from.name} → ${leg.to.name} 지도에서 보기`}
                      aria-pressed={
                        activeRoute?.legIndex === index && activeRoute.segmentIndex === null
                      }
                      onClick={() => onFocusRoute(index, null)}
                    >
                      <MapPin size={13} />
                      {index + 1}. {leg.from.name} → {leg.to.name}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs"
                      aria-label={`${index + 1}구간 ${isOpen ? '접기' : '펼치기'}`}
                      aria-expanded={isOpen}
                      aria-controls={legDetailsId}
                      onClick={() =>
                        setDisclosure({
                          itinerary,
                          closed: isOpen
                            ? [...closedLegs, index]
                            : closedLegs.filter((value) => value !== index),
                        })
                      }
                    >
                      {isOpen ? '접기' : '펼치기'}
                      <ChevronDown
                        className={isOpen ? 'size-3 rotate-180' : 'size-3'}
                        aria-hidden="true"
                      />
                    </Button>
                  </div>
                  {leg.warning ? <p className="warning-text">{leg.warning}</p> : null}
                  <div id={legDetailsId} hidden={!isOpen}>
                    {!itinerary.demo ? (
                      <Button asChild variant="outline" size="sm" className="my-2 w-full text-xs">
                        <a
                          href={getKakaoRouteUrl(leg)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${index + 1}구간 카카오맵에서 보기: ${leg.from.name} → ${leg.to.name} · 새 창`}
                        >
                          {index + 1}구간 카카오맵에서 보기 <ExternalLink size={13} />
                        </a>
                      </Button>
                    ) : null}
                    {leg.segments.length === 0 ? (
                      leg.warning ? null : (
                        <p>같은 위치 · 이동 없음</p>
                      )
                    ) : (
                      leg.segments.map((segment, segmentIndex) => (
                        <Button
                          variant="ghost"
                          className="segment h-auto w-full justify-start whitespace-normal px-2 py-2 text-left text-xs"
                          key={segmentIndex}
                          aria-label={`${index + 1}-${segmentIndex + 1}. ${segment.instruction} 지도에서 보기`}
                          aria-pressed={
                            activeRoute?.legIndex === index &&
                            activeRoute.segmentIndex === segmentIndex
                          }
                          onClick={() => onFocusRoute(index, segmentIndex)}
                        >
                          {segment.mode === 'walk' ? (
                            <Footprints size={13} />
                          ) : segment.mode === 'bus' ? (
                            <Bus size={13} />
                          ) : (
                            <TrainFront size={13} />
                          )}
                          <span>
                            {segment.instruction}
                            <small>
                              {formatMinutes(segment.seconds)}
                              {segment.mode !== 'walk' ? ` · ${segment.stops ?? '?'}정거장` : ''}
                            </small>
                          </span>
                        </Button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
