'use client';

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/common/design-system/components/Button';
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
import './style.css';

export function TripPage() {
  const config = useQuery(tripQueries.config());
  if (!config.data)
    return (
      <div className="app-loading">
        <span className="brand-logo">⌁</span>
        <h1>가까이</h1>
        {config.error ? (
          <>
            <p role="alert">서버에 연결하지 못했어요. 앱이 실행 중인지 확인해주세요.</p>
            <Button onClick={() => config.refetch()}>다시 연결하기</Button>
          </>
        ) : (
          <p role="status">오늘의 작은 여행을 준비하고 있어요.</p>
        )}
      </div>
    );
  return (
    <Planner
      key={config.data.demo ? 'demo' : 'live'}
      demo={config.data.demo}
      initialOrigin={config.data.demo ? config.data.demoOrigin : null}
      configured={config.data.configured}
    />
  );
}

function Planner({
  demo,
  initialOrigin,
  configured,
}: {
  demo: boolean;
  initialOrigin: Place | null;
  configured: boolean;
}) {
  const planner = useTripPlanner(initialOrigin);
  const [activeView, setActiveView] = useState<'discover' | 'map'>('discover');
  const discoverTab = useRef<HTMLButtonElement>(null);
  const mapTab = useRef<HTMLButtonElement>(null);
  const routeMap = useRef<RouteMapHandle>(null);
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
  const nearby = useNearbyPlaces(planner.origin, planner.destination);
  const mapPlaces =
    nearby.places.length > 0 || nearby.recommendations.length === 0
      ? nearby.places
      : nearby.recommendations;

  async function handleBuildPlan() {
    const result = await planner.buildPlan();
    if (result) {
      setActiveView('map');
      mapTab.current?.focus();
    }
  }

  return (
    <div className="app-shell">
      <TripHeader demo={demo} configured={configured} />
      <nav className="trip-stepper" aria-label="여행 단계">
        <ol>
          <li>
            <Button
              variant="ghost"
              className="h-auto w-full px-1 py-2"
              ref={discoverTab}
              aria-label="1단계 출발·도착·주변 선택"
              aria-current={activeView === 'discover' ? 'step' : undefined}
              aria-controls="discover-view"
              data-complete={!!planner.origin}
              onClick={() => setActiveView('discover')}
            >
              <span className="step-number" aria-hidden="true">
                1
              </span>
              <span>출발·도착·주변 선택</span>
            </Button>
          </li>
          <li>
            <Button
              ref={mapTab}
              variant="ghost"
              className="h-auto w-full px-1 py-2"
              aria-label="2단계 동선 보기"
              aria-current={activeView !== 'discover' ? 'step' : undefined}
              aria-controls="map-view"
              disabled={!planner.itinerary}
              onClick={() => setActiveView('map')}
            >
              <span className="step-number" aria-hidden="true">
                2
              </span>
              <span>동선 보기</span>
            </Button>
          </li>
        </ol>
      </nav>
      <main className="planner-layout">
        <aside
          id="discover-view"
          className="discover-panel"
          aria-label="장소 찾기와 선택"
          aria-hidden={activeView !== 'discover'}
          inert={activeView !== 'discover'}
          data-active={activeView === 'discover'}
          data-has-origin={!!planner.origin}
        >
          <TripEndpoints
            origin={planner.origin}
            destination={planner.destination}
            demo={demo}
            onOriginChange={planner.changeOrigin}
            onDestinationChange={planner.changeDestination}
          />
          {planner.origin ? (
            <>
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
        </aside>
        <section
          id="map-view"
          className="map-panel"
          aria-label="여행 지도"
          aria-hidden={activeView !== 'map'}
          inert={activeView !== 'map'}
          data-active={activeView === 'map'}
        >
          <TripMap
            ref={routeMap}
            demo={demo}
            origin={planner.origin}
            destination={planner.destination}
            places={mapPlaces}
            selected={planner.selected}
            itinerary={planner.itinerary}
            onSelect={(place) => {
              if (planner.selected.some((item) => item.id === place.id)) return;
              planner.togglePlace(place);
            }}
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
          <RouteSheet
            origin={planner.origin}
            destination={planner.destination}
            itinerary={planner.itinerary}
            activeRoute={activeRoute}
            isPlanning={planner.isPlanning}
            onFocusRoute={handleRouteFocus}
            onEdit={() => setActiveView('discover')}
            onRebuild={handleBuildPlan}
            onReturnFocus={(target) => {
              (target === 'map' ? mapTab : discoverTab).current?.focus({ preventScroll: true });
            }}
          />
        </section>
      </main>
      {activeView === 'discover' && planner.origin ? (
        <div className="step-next-action">
          {planner.error ? (
            <p role="alert" className="mb-2 text-xs text-destructive">
              {planner.error}
            </p>
          ) : null}
          <Button
            className="h-11 w-full"
            disabled={
              !planner.origin ||
              (!planner.selected.length && !planner.destination) ||
              planner.isPlanning
            }
            onClick={handleBuildPlan}
          >
            {planner.isPlanning ? (
              <>
                <span className="spinner" /> 길을 찾아보고 있어요
              </>
            ) : (
              <>
                <span>순서대로 동선 짜기</span>
                {planner.selected.length > 0 ? <span>· {planner.selected.length}곳</span> : null}
                <ArrowRight size={17} />
              </>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
