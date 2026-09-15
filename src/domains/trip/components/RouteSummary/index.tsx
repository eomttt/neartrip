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
import { formatDistance } from '../../utils/route-order';
import { getKakaoRouteUrl } from '../../utils/kakao-route-url';
import { getGoogleRouteUrl } from '../../utils/google-route-url';
import { useI18n } from '@/common/i18n/components/I18nProvider';
import { localizeTripText } from '../../i18n/localize-trip-text';

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
  const { locale, t } = useI18n();
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
        <h2 id="route-title">{t('route.title')}</h2>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          {t('route.edit')}
        </Button>
      </div>
      <div className="route-start">
        <House size={14} />
        <span>{origin?.name}</span>
        <small>{t('route.depart')}</small>
      </div>
      <div className="route-start">
        <Flag size={14} />
        <span>{destination?.name ?? origin?.name}</span>
        <small>{destination ? t('route.arrive') : t('route.return')}</small>
      </div>
      {itinerary ? (
        <div className={`route-result ${hasWarnings ? 'route-incomplete' : ''}`} aria-live="polite">
          <div className="route-result-title">
            {hasWarnings ? <TriangleAlert size={17} /> : <CircleCheck size={17} />}
            <strong>
              {hasWarnings
                ? t('route.warningTitle')
                : itinerary.demo
                  ? t('route.demoTitle')
                  : t('route.readyTitle')}
            </strong>
          </div>
          <p>
            {hasWarnings ? t('route.shownTotal') : t('route.travelOnly')}{' '}
            {totalSeconds
              ? t('route.minutes', { count: Math.max(1, Math.ceil(totalSeconds / 60)) })
              : t('route.zeroMinutes')}
            <span>·</span>
            {formatDistance(totalMeters)}
            {itinerary.demo ? ` ${t('route.estimate')}` : ''}
          </p>
          <h3 className="route-details-title">{t('route.legs')}</h3>
          <div
            className="route-details-scroll"
            role="region"
            aria-label={t('route.legsRegion')}
            tabIndex={0}
          >
            <p className="route-detail-hint">{t('route.hint')}</p>
            {itinerary.legs.map((leg, index) => {
              const isOpen = !closedLegs.includes(index);
              const legDetailsId = `${detailsId}-${index}`;
              return (
                <div className="leg" key={`${leg.from.id}-${leg.to.id}`}>
                  <div className="flex items-start gap-1">
                    <Button
                      variant="ghost"
                      className="route-leg-trigger h-auto min-w-0 flex-1 justify-start whitespace-normal px-2 py-2 text-left text-xs"
                      aria-label={t('route.viewLeg', {
                        index: index + 1,
                        from: leg.from.name,
                        to: leg.to.name,
                      })}
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
                      aria-label={t(isOpen ? 'route.collapse' : 'route.expand', {
                        index: index + 1,
                      })}
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
                      {isOpen ? t('route.collapseText') : t('route.expandText')}
                      <ChevronDown
                        className={isOpen ? 'size-3 rotate-180' : 'size-3'}
                        aria-hidden="true"
                      />
                    </Button>
                  </div>
                  {leg.warning ? (
                    <p className="warning-text">{localizeTripText(locale, leg.warning)}</p>
                  ) : null}
                  <div id={legDetailsId} hidden={!isOpen}>
                    {!itinerary.demo ? (
                      <div className="my-2 grid grid-cols-2 gap-2">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-auto min-w-0 whitespace-normal px-2 py-2 text-center text-xs"
                        >
                          <a
                            href={getKakaoRouteUrl(leg)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={t('route.kakaoLabel', {
                              index: index + 1,
                              from: leg.from.name,
                              to: leg.to.name,
                            })}
                          >
                            {t('route.kakao', { index: index + 1 })} <ExternalLink size={13} />
                          </a>
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-auto min-w-0 whitespace-normal px-2 py-2 text-center text-xs"
                        >
                          <a
                            href={getGoogleRouteUrl(leg)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={t('route.googleLabel', {
                              index: index + 1,
                              from: leg.from.name,
                              to: leg.to.name,
                            })}
                          >
                            {t('route.google', { index: index + 1 })} <ExternalLink size={13} />
                          </a>
                        </Button>
                      </div>
                    ) : null}
                    {leg.segments.length === 0 ? (
                      leg.warning ? null : (
                        <p>{t('route.samePlace')}</p>
                      )
                    ) : (
                      leg.segments.map((segment, segmentIndex) => (
                        <Button
                          variant="ghost"
                          className="segment h-auto w-full justify-start whitespace-normal px-2 py-2 text-left text-xs"
                          key={segmentIndex}
                          aria-label={t('route.viewSegment', {
                            leg: index + 1,
                            segment: segmentIndex + 1,
                            instruction: localizeTripText(locale, segment.instruction),
                          })}
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
                            {localizeTripText(locale, segment.instruction)}
                            <small>
                              {t('route.minutes', {
                                count: Math.max(1, Math.ceil(segment.seconds / 60)),
                              })}
                              {segment.mode !== 'walk'
                                ? ` ${t('route.stops', { count: segment.stops ?? '?' })}`
                                : ''}
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
