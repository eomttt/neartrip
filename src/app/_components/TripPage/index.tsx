'use client';

import { useRef, useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Car, Footprints, Navigation } from 'lucide-react';
import { Button } from '@/common/design-system/components/Button';
import { useI18n } from '@/common/i18n/components/I18nProvider';
import { getRouteHighlight, type RouteMapHandle } from '@/domains/trip/utils/route-highlight';
import type { Itinerary, Place } from '@/domains/trip/models/model-trip';
import { tripQueries } from '@/domains/trip/queries/tripQueries';
import { useTripPlanner } from '@/domains/trip/hooks/useTripPlanner';
import { useNearbyPlaces } from '@/domains/trip/hooks/useNearbyPlaces';
import { NearbyPlaces } from '@/domains/trip/components/NearbyPlaces';
import { SelectedPlaces } from '@/domains/trip/components/SelectedPlaces';
import { TripMap } from '@/domains/trip/components/TripMap';
import { TripHeader } from './components/TripHeader';
import { RouteSheet } from './components/RouteSheet';
import { TripEndpoints } from './components/TripEndpoints';
import { MapPlaceFilters } from './components/MapPlaceFilters';
import { PlaceRadiusSelect } from '@/domains/trip/components/PlaceFilters';
import './style.css';

const desktopMediaQuery = '(min-width: 1024px)';
function subscribeDesktop(onChange: () => void) {
  const media = window.matchMedia?.(desktopMediaQuery);
  media?.addEventListener('change', onChange);
  return () => media?.removeEventListener('change', onChange);
}
function getDesktopSnapshot() {
  return window.matchMedia?.(desktopMediaQuery).matches ?? false;
}
function getServerDesktopSnapshot() {
  return null;
}

interface Props {
  initialConfig: { demo: boolean; configured: boolean; demoOrigin: Place };
}

export function TripPage({ initialConfig }: Props) {
  const { t } = useI18n();
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    getDesktopSnapshot,
    getServerDesktopSnapshot,
  );
  const config = useQuery({ ...tripQueries.config(), initialData: initialConfig });
  if (!config.data)
    return (
      <div className="app-loading">
        <span className="brand-logo" aria-hidden="true">
          <Navigation size={21} />
        </span>
        <h1>{t('loading.brand')}</h1>
        {config.error ? (
          <>
            <p role="alert">{t('loading.serverError')}</p>
            <Button onClick={() => config.refetch()}>{t('loading.retry')}</Button>
          </>
        ) : (
          <p role="status">{t('loading.preparing')}</p>
        )}
      </div>
    );
  return (
    <Planner
      // 서버에는 화면 폭이 없으므로 첫 브라우저 렌더에서만 기본 이동 조건을 초기화한다.
      key={`${config.data.demo ? 'demo' : 'live'}-${isDesktop === null ? 'server' : 'browser'}`}
      demo={config.data.demo}
      initialOrigin={config.data.demo ? config.data.demoOrigin : null}
      configured={config.data.configured}
      isDesktop={isDesktop ?? false}
    />
  );
}

function Planner({
  demo,
  initialOrigin,
  configured,
  isDesktop,
}: {
  demo: boolean;
  initialOrigin: Place | null;
  configured: boolean;
  isDesktop: boolean;
}) {
  const { t } = useI18n();
  const planner = useTripPlanner(initialOrigin, isDesktop ? 'driving' : 'local');
  const [activeView, setActiveView] = useState<'discover' | 'map'>('discover');
  const [routeDetailsOpen, setRouteDetailsOpen] = useState(false);
  const discoverTab = useRef<HTMLButtonElement>(null);
  const mapTab = useRef<HTMLButtonElement>(null);
  const routeMap = useRef<RouteMapHandle>(null);
  const mapPanel = useRef<HTMLElement>(null);
  const travelModeButton = useRef<HTMLButtonElement>(null);
  const [focusedRoute, setFocusedRoute] = useState<{
    itinerary: Itinerary;
    legIndex: number;
    segmentIndex: number | null;
  } | null>(null);
  const activeRoute = focusedRoute?.itinerary === planner.itinerary ? focusedRoute : null;
  function handleRouteFocus(legIndex: number, segmentIndex: number | null) {
    if (!planner.itinerary) return;
    const highlight = getRouteHighlight(planner.itinerary, legIndex, segmentIndex);
    if (!highlight) return;
    setFocusedRoute({ itinerary: planner.itinerary, legIndex, segmentIndex });
    routeMap.current?.highlightRoute(highlight);
  }
  const nearby = useNearbyPlaces(planner.origin, planner.destination, isDesktop ? 10_000 : 1_000);
  const mapPlaces =
    nearby.places.length > 0 || nearby.recommendations.length === 0
      ? nearby.places
      : nearby.recommendations;

  async function handleBuildPlan() {
    const result = await planner.buildPlan();
    if (result) {
      setActiveView('map');
      setRouteDetailsOpen(true);
      if (isDesktop) mapPanel.current?.focus({ preventScroll: true });
      else mapTab.current?.focus();
    }
  }

  return (
    <div className="app-shell">
      <TripHeader demo={demo} configured={configured} />
      <nav className="trip-stepper" aria-label={t('steps.label')} hidden={isDesktop}>
        <ol>
          <li>
            <Button
              variant="ghost"
              className="h-auto w-full rounded-none px-1 py-2"
              ref={discoverTab}
              aria-label={t('steps.discoverLabel')}
              aria-current={activeView === 'discover' ? 'step' : undefined}
              aria-controls="discover-view"
              data-complete={!!planner.origin}
              onClick={() => setActiveView('discover')}
            >
              <span className="step-number" aria-hidden="true">
                1
              </span>
              <span>{t('steps.discover')}</span>
            </Button>
          </li>
          <li>
            <Button
              ref={mapTab}
              variant="ghost"
              className="h-auto w-full rounded-none px-1 py-2"
              aria-label={t('steps.routeLabel')}
              aria-current={activeView !== 'discover' ? 'step' : undefined}
              aria-controls="map-view"
              disabled={!planner.itinerary}
              onClick={() => setActiveView('map')}
            >
              <span className="step-number" aria-hidden="true">
                2
              </span>
              <span>{t('steps.route')}</span>
            </Button>
          </li>
        </ol>
      </nav>
      <main className="planner-layout">
        <aside
          id="discover-view"
          className="discover-panel"
          aria-label={t('discover.region')}
          aria-hidden={!isDesktop && activeView !== 'discover'}
          inert={!isDesktop && activeView !== 'discover'}
          data-active={isDesktop || activeView === 'discover'}
          data-has-origin={!!planner.origin}
        >
          {planner.origin ? (
            <div className="planner-heading">
              <span>{t('planner.eyebrow')}</span>
              <h1>{t('planner.title')}</h1>
              <p>{t('planner.description')}</p>
            </div>
          ) : null}
          <TripEndpoints
            origin={planner.origin}
            destination={planner.destination}
            demo={demo}
            onOriginChange={planner.changeOrigin}
            onDestinationChange={planner.changeDestination}
          />
          {planner.origin ? (
            <>
              <div className="trip-travel-options">
                {isDesktop ? (
                  <div className="trip-radius">
                    <PlaceRadiusSelect
                      id="desktop-search-radius"
                      radius={nearby.radius}
                      onRadiusChange={nearby.onRadiusChange}
                    />
                  </div>
                ) : null}
                <div role="group" aria-label={t('travel.label')} className="travel-mode-switch">
                  <Button
                    ref={travelModeButton}
                    size="sm"
                    variant="ghost"
                    aria-pressed={planner.travelMode === 'local'}
                    onClick={() => planner.changeTravelMode('local')}
                  >
                    <Footprints size={14} /> {t('travel.local')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-pressed={planner.travelMode === 'driving'}
                    onClick={() => planner.changeTravelMode('driving')}
                  >
                    <Car size={14} /> {t('travel.driving')}
                  </Button>
                </div>
                <p>
                  {t(planner.travelMode === 'driving' ? 'travel.drivingHint' : 'travel.localHint')}
                </p>
              </div>
              <SelectedPlaces
                places={planner.selected}
                onMove={planner.movePlace}
                onRemove={planner.togglePlace}
                onReset={planner.resetPlaces}
              />
              <NearbyPlaces
                {...nearby}
                demo={demo}
                origin={planner.origin}
                selected={planner.selected}
                onSelect={planner.togglePlace}
              />
            </>
          ) : null}
          {(isDesktop || activeView === 'discover') && planner.origin ? (
            <div className="step-next-action">
              {planner.selected.length === 0 ? (
                <p className="selection-hint">{t('planner.selectionHint')}</p>
              ) : null}
              {planner.error ? (
                <p role="alert" className="mb-2 text-xs text-destructive">
                  {planner.error}
                </p>
              ) : null}
              <Button
                className="build-plan-button h-12 w-full"
                disabled={
                  !planner.origin ||
                  (!planner.selected.length && !planner.destination) ||
                  planner.isPlanning
                }
                onClick={handleBuildPlan}
              >
                {planner.isPlanning ? (
                  <>
                    <span className="spinner" /> {t('plan.loading')}
                  </>
                ) : (
                  <>
                    <span>{t('plan.build')}</span>
                    {planner.selected.length > 0 ? (
                      <span>{t('plan.placeCount', { count: planner.selected.length })}</span>
                    ) : null}
                    <ArrowRight size={17} />
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </aside>
        <section
          ref={mapPanel}
          tabIndex={-1}
          id="map-view"
          className="map-panel"
          aria-label={t('map.region')}
          aria-hidden={!isDesktop && activeView !== 'map'}
          inert={!isDesktop && activeView !== 'map'}
          data-active={isDesktop || activeView === 'map'}
          data-route-details={routeDetailsOpen && (!isDesktop || !!planner.itinerary)}
        >
          <TripMap
            ref={routeMap}
            demo={demo}
            origin={planner.origin}
            destination={planner.destination}
            places={mapPlaces}
            selected={planner.selected}
            itinerary={planner.itinerary}
            onShowEntireRoute={() => setFocusedRoute(null)}
            onSelect={planner.togglePlace}
          />
          <MapPlaceFilters
            categories={nearby.categories}
            radius={nearby.radius}
            crowdingLevels={nearby.crowdingLevels}
            petOnly={nearby.petOnly}
            festivalOnly={nearby.festivalOnly}
            placeCount={mapPlaces.length}
            selectedCount={planner.selected.length}
            onCategoryToggle={nearby.onCategoryToggle}
            onCrowdingLevelToggle={nearby.onCrowdingLevelToggle}
            onPetOnlyChange={nearby.onPetOnlyChange}
            onFestivalOnlyChange={nearby.onFestivalOnlyChange}
            onRadiusChange={nearby.onRadiusChange}
          />
          {!isDesktop || planner.itinerary ? (
            <RouteSheet
              origin={planner.origin}
              destination={planner.destination}
              itinerary={planner.itinerary}
              selected={planner.selected}
              activeRoute={activeRoute}
              isOpen={routeDetailsOpen}
              isPlanning={planner.isPlanning}
              onOpenChange={setRouteDetailsOpen}
              onFocusRoute={handleRouteFocus}
              onEdit={() => {
                setActiveView('discover');
                if (isDesktop) travelModeButton.current?.focus({ preventScroll: true });
                else discoverTab.current?.focus({ preventScroll: true });
              }}
              onRebuild={handleBuildPlan}
            />
          ) : null}
        </section>
      </main>
    </div>
  );
}
