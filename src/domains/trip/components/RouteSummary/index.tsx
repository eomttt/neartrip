import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Bus,
  CircleCheck,
  Footprints,
  House,
  MapPin,
  RotateCcw,
  TrainFront,
  X,
} from 'lucide-react';
import type { Itinerary, Place } from '../../models/model-trip';
import { formatDistance, formatMinutes } from '../../utils/route-order';

interface Props {
  origin: Place | null;
  selected: Place[];
  itinerary: Itinerary | null;
  isPlanning: boolean;
  onRemove: (place: Place) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onReset: () => void;
  onBuild: (order: 'nearby' | 'manual') => void;
}

export function RouteSummary({
  origin,
  selected,
  itinerary,
  isPlanning,
  onRemove,
  onMove,
  onReset,
  onBuild,
}: Props) {
  const segments = itinerary?.legs.flatMap((leg) => leg.segments) ?? [];
  const incomplete = itinerary?.legs.some((leg) => leg.warning) ?? false;
  const totalSeconds = segments.reduce((sum, segment) => sum + segment.seconds, 0);
  const totalMeters = segments.reduce((sum, segment) => sum + segment.meters, 0);
  return (
    <section className="route-panel" aria-labelledby="route-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">MY LITTLE TRIP</span>
          <h2 id="route-title">
            담아둔 하루{' '}
            <span>
              {selected.length}
              <small> / 5</small>
            </span>
          </h2>
        </div>
        {selected.length > 0 ? (
          <button className="text-button" onClick={onReset}>
            <RotateCcw size={13} /> 비우기
          </button>
        ) : (
          <MapPin size={21} className="muted" />
        )}
      </div>
      {selected.length === 0 ? (
        <div className="empty-route">
          <span className="empty-route-icon">
            <Footprints size={25} />
          </span>
          <p>마음이 가는 곳을 담아보세요.</p>
          <span>가까운 곳들을 이어 하루를 만들어드릴게요.</span>
        </div>
      ) : (
        <>
          <div className="route-start">
            <House size={14} />
            <span>{origin?.name}</span>
            <small>출발</small>
          </div>
          <ol className="route-list">
            {selected.map((place, index) => (
              <li key={place.id}>
                <span className="stop-number">{index + 1}</span>
                <div className="stop-copy">
                  <strong>{place.name}</strong>
                  <span>{place.address}</span>
                </div>
                <div className="stop-actions">
                  <button
                    aria-label={`${place.name} 앞으로`}
                    disabled={index === 0}
                    onClick={() => onMove(index, -1)}
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    aria-label={`${place.name} 뒤로`}
                    disabled={index === selected.length - 1}
                    onClick={() => onMove(index, 1)}
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    aria-label={`${place.name} 일정에서 빼기`}
                    onClick={() => onRemove(place)}
                  >
                    <X size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <div className="route-start route-end">
            <House size={14} />
            <span>{origin?.name}</span>
            <small>돌아오기</small>
          </div>
        </>
      )}
      {itinerary ? (
        <div className={`route-result ${incomplete ? 'route-incomplete' : ''}`} aria-live="polite">
          <div className="route-result-title">
            <CircleCheck size={17} />
            <strong>
              {incomplete
                ? '이동이 어려운 구간이 있어요'
                : itinerary.demo
                  ? '예시 동선을 만들었어요'
                  : '오늘의 동선이 준비됐어요'}
            </strong>
          </div>
          <p>
            {incomplete ? '확인된 구간만 합산 · ' : '이동만 · '}
            {totalSeconds ? formatMinutes(totalSeconds) : '0분'}
            <span>·</span>
            {formatDistance(totalMeters)}
            {itinerary.demo ? ' · 추정치' : ''}
          </p>
          <details>
            <summary>구간별 이동 보기</summary>
            {itinerary.legs.map((leg, index) => (
              <div className="leg" key={`${leg.from.id}-${leg.to.id}`}>
                <strong>
                  {index + 1}. {leg.from.name} → {leg.to.name}
                </strong>
                {leg.warning ? (
                  <p className="warning-text">{leg.warning}</p>
                ) : leg.segments.length === 0 ? (
                  <p>같은 위치 · 이동 없음</p>
                ) : (
                  leg.segments.map((segment, segmentIndex) => (
                    <div className="segment" key={segmentIndex}>
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
                          {segment.mode !== 'walk'
                            ? ` · 정류장 목록 ${segment.stops ?? '?'}개`
                            : ''}
                        </small>
                      </span>
                    </div>
                  ))
                )}
              </div>
            ))}
          </details>
        </div>
      ) : null}
      <button
        className="primary-button"
        disabled={selected.length === 0 || isPlanning}
        onClick={() => onBuild('nearby')}
      >
        {isPlanning ? (
          <span className="spinner" />
        ) : (
          <span className="route-glyph" aria-hidden="true">
            ⌁
          </span>
        )}
        <span>{isPlanning ? '길을 찾아보고 있어요' : '가까운 순서로 동선 짜기'}</span>
        <ArrowUpRight size={18} />
      </button>
      {selected.length > 1 ? (
        <button className="manual-button" disabled={isPlanning} onClick={() => onBuild('manual')}>
          내가 담은 순서대로 길찾기
        </button>
      ) : null}
      <p className="route-footnote">
        도보 20분 우선 · 대중교통 최대 5정거장
        <br />
        방문 순서는 직선거리 기준, 이동 경로는 별도로 조회해요.
      </p>
    </section>
  );
}
