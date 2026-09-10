import { getRouteHighlight, type RouteMapHandle } from '../../domains/trip/utils/route-highlight';
import type { Itinerary } from '../../domains/trip/models/model-trip';
import { Input } from '@/common/design-system/components/Input';
import { NativeSelect, NativeSelectOption } from '@/common/design-system/components/NativeSelect';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/common/design-system/components/Dialog';
import { Button } from '@/common/design-system/components/Button';
import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Check,
  Coffee,
  Compass,
  Footprints,
  Info,
  Leaf,
  MapPin,
  ListOrdered,
  Route,
  Search,
  UtensilsCrossed,
} from 'lucide-react';
import { searchTripQueries } from '../../domains/trip/queries/searchTripQueries';
import { categoryLabels, type Category, type Place } from '../../domains/trip/models/model-trip';
import { useTripPlanner } from '../../domains/trip/hooks/useTripPlanner';
import { PlaceCard } from '../../domains/trip/components/PlaceCard';
import { DestinationPicker } from '../../domains/trip/components/DestinationPicker';
import { SelectedPlaces } from '../../domains/trip/components/SelectedPlaces';
import { RouteSummary } from '../../domains/trip/components/RouteSummary';
import { DemoMap } from '../../domains/trip/components/DemoMap';
import { KakaoMap } from '../../domains/trip/components/KakaoMap';
import { distanceMeters } from '../../domains/trip/utils/route-order';

const categories: { value: Category; Icon: typeof Coffee }[] = [
  { value: 'restaurant', Icon: UtensilsCrossed },
  { value: 'cafe', Icon: Coffee },
  { value: 'attraction', Icon: Leaf },
];

export function TripPage() {
  const config = useQuery(searchTripQueries.config());
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
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  const sheetReturnTarget = useRef<'trigger' | 'map' | 'discover'>('trigger');
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
    sheetReturnTarget.current = 'map';
    setShowRouteDetails(false);
    routeMap.current?.highlightRoute(highlight);
  }
  const originSearch = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [category, setCategory] = useState<Category>();
  const [radius, setRadius] = useState(1_000);
  const [showHelp, setShowHelp] = useState(false);
  const search = useQuery(searchTripQueries.places(query));
  const nearby = useQuery(searchTripQueries.nearby(planner.origin, category, radius));
  const places = useMemo(
    () =>
      (nearby.data ?? [])
        .filter((place) => place.id !== planner.origin?.id && place.id !== planner.destination?.id)
        .toSorted((a, b) =>
          planner.origin
            ? distanceMeters(planner.origin, a) - distanceMeters(planner.origin, b)
            : 0,
        ),
    [nearby.data, planner.origin, planner.destination],
  );
  const selectedIds = new Set(planner.selected.map((place) => place.id));
  const MapComponent = demo ? DemoMap : KakaoMap;
  function handleOriginSelect(place: Place) {
    planner.changeOrigin(place);
    setShowSearch(false);
    setInput('');
    setQuery('');
  }

  async function handleBuildPlan() {
    const result = await planner.buildPlan();
    if (result) {
      setActiveView('map');
      mapTab.current?.focus();
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <a href="/" className="brand" aria-label="가까이 홈">
          <span className="brand-logo">⌁</span>
          <span>
            가까이<small>neartrip</small>
          </span>
        </a>
        <span className="header-tagline">멀리 떠나지 않아도, 여행</span>
        <Dialog open={showHelp} onOpenChange={setShowHelp}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="help-button">
              <Compass size={16} /> 이용 방법
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="pr-5 leading-relaxed">
                장소 하나에서 시작하는 작은 여행
              </DialogTitle>
              <DialogDescription className="leading-relaxed">
                여행 중 묵는 숙소를 검색해보세요. 근처에서 마음에 드는 곳을 5곳까지 담으면 오늘의
                동선을 만들어요.
              </DialogDescription>
            </DialogHeader>
            <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed">
              <li>숙소를 출발점으로 정하고 맛집·카페·가볼 만한 곳을 골라요.</li>
              <li>숙소로 돌아오는 동선이 기본이에요. 마지막 도착점은 따로 정할 수도 있어요.</li>
              <li>
                동선을 만들면 2단계 지도에서 확인해요. 이동 안내를 누르면 구간을 살펴볼 수 있어요.
              </li>
            </ol>
            <p className="text-xs leading-relaxed text-muted-foreground">
              도착점을 선택하면 그곳에서 여행을 마치고, 비워두면 출발점으로 돌아와요.
              날짜·영업시간·체류시간은 포함되지 않아요.
            </p>
            <DialogFooter>
              <DialogClose asChild>
                <Button>여행 시작하기</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>
      {demo ? (
        <div className="demo-banner">
          <Info size={14} />
          <span>
            <strong>예시로 둘러보는 중</strong> 가상의 맛집·카페와 개략도로 체험해보세요. 실제 장소
            검색은 카카오 키 연결 후 사용할 수 있어요.
          </span>
        </div>
      ) : !configured ? (
        <div className="demo-banner" role="alert">
          <Info size={14} />
          카카오 키 설정이 일부 빠져 있어요. .env.local의 REST 키와 JavaScript 키를 확인해주세요.
        </div>
      ) : null}
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
          <div className="discover-intro">
            <span className="eyebrow">
              <span className="tiny-line" /> A DAY, CLOSE BY
            </span>
            <h1>숙소 근처, 오늘 어디 가지?</h1>
            <p>근처 맛집·카페·가볼 만한 곳을 골라 오늘의 동선을 만들어보세요.</p>
          </div>
          <form
            className="search-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!input.trim()) return;
              setQuery(input.trim());
              setShowSearch(true);
            }}
          >
            <Search size={19} />
            <label className="sr-only" htmlFor="origin-search">
              출발 장소 검색
            </label>
            <Input
              className="h-10 border-0 px-0 text-base shadow-none focus-visible:ring-0 md:text-xs"
              ref={originSearch}
              id="origin-search"
              value={input}
              maxLength={80}
              onChange={(event) => setInput(event.target.value)}
              placeholder={demo ? '예시: 성수역, 작은 식탁' : '지금 묵는 숙소 이름이나 주소'}
            />
            <Button size="icon-sm" type="submit" aria-label="장소 검색" disabled={!input.trim()}>
              <ArrowRight size={18} />
            </Button>
          </form>
          <Dialog open={showSearch} onOpenChange={setShowSearch}>
            <DialogContent
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                originSearch.current?.focus({ preventScroll: true });
              }}
            >
              <DialogHeader>
                <DialogTitle>여기서 출발할까요?</DialogTitle>
                <DialogDescription>검색한 장소 중 오늘의 출발점을 골라주세요.</DialogDescription>
              </DialogHeader>
              <section
                className="max-h-[45dvh] overflow-y-auto overscroll-contain"
                aria-label="출발 장소 검색 결과"
              >
                {search.isFetching ? (
                  <p role="status">장소를 찾고 있어요.</p>
                ) : search.error ? (
                  <p role="alert">{search.error.message}</p>
                ) : search.data?.length ? (
                  search.data.map((place) => (
                    <Button
                      variant="ghost"
                      className="search-result h-auto whitespace-normal rounded-none"
                      key={place.id}
                      onClick={() => handleOriginSelect(place)}
                    >
                      <MapPin size={16} />
                      <span>
                        <strong>{place.name}</strong>
                        <small>{place.address}</small>
                      </span>
                      <ArrowRight size={15} />
                    </Button>
                  ))
                ) : (
                  <p>
                    검색 결과가 없어요.{' '}
                    {demo
                      ? '예시 모드에서는 성수역을 검색해보세요.'
                      : '장소명이나 주소를 바꿔보세요.'}
                  </p>
                )}
              </section>
            </DialogContent>
          </Dialog>
          {planner.origin ? (
            <div className="origin-card">
              <span className="origin-icon">
                <MapPin size={19} />
              </span>
              <div>
                <small>오늘의 시작점</small>
                <strong>{planner.origin.name}</strong>
              </div>
              <span className="origin-check">
                <Check size={15} />
              </span>
            </div>
          ) : (
            <div className="origin-placeholder">
              <MapPin size={18} /> 묵는 숙소나 출발할 장소를 검색해주세요.
            </div>
          )}
          <DestinationPicker value={planner.destination} onChange={planner.changeDestination} />
          <SelectedPlaces
            places={planner.selected}
            onMove={planner.movePlace}
            onRemove={planner.togglePlace}
            onReset={planner.resetPlaces}
          />
          <section className="nearby-section" aria-labelledby="nearby-title">
            <div className="section-heading">
              <h2 id="nearby-title">오늘 들러볼 곳</h2>
              <div className="radius-select">
                <label className="sr-only" htmlFor="search-radius">
                  검색 반경
                </label>
                <NativeSelect
                  id="search-radius"
                  size="sm"
                  className="text-xs"
                  value={radius}
                  onChange={(event) => setRadius(Number(event.target.value))}
                >
                  <NativeSelectOption value={500}>반경 500m</NativeSelectOption>
                  <NativeSelectOption value={1000}>반경 1km</NativeSelectOption>
                  <NativeSelectOption value={2000}>반경 2km</NativeSelectOption>
                  <NativeSelectOption value={3000}>반경 3km</NativeSelectOption>
                </NativeSelect>
              </div>
            </div>
            <div className="category-filters" role="group" aria-label="장소 종류">
              <Button
                variant={!category ? 'default' : 'outline'}
                size="sm"
                className="px-2 text-xs"
                aria-pressed={!category}
                onClick={() => setCategory(undefined)}
              >
                전체
              </Button>
              {categories.map(({ value, Icon }) => (
                <Button
                  key={value}
                  variant={category === value ? 'default' : 'outline'}
                  size="sm"
                  className="px-2 text-xs"
                  aria-pressed={category === value}
                  onClick={() => setCategory(value)}
                >
                  <Icon size={14} />
                  {categoryLabels[value]}
                </Button>
              ))}
            </div>
            <div className="results-caption">
              <span>
                {demo ? '예시 장소' : '가까운 장소'} <strong>{places.length}</strong>곳
              </span>
              <span>직선거리순</span>
            </div>
            <div
              className="place-list"
              role="region"
              aria-label="주변 장소 목록"
              tabIndex={0}
              aria-busy={nearby.isFetching}
            >
              {nearby.isFetching ? (
                <div className="list-message" role="status">
                  <span className="spinner" /> 주변 장소를 찾고 있어요.
                </div>
              ) : nearby.error ? (
                <div className="list-message" role="alert">
                  <p>{nearby.error.message}</p>
                  <Button onClick={() => nearby.refetch()}>다시 찾기</Button>
                </div>
              ) : planner.origin ? (
                places.length > 0 ? (
                  places.map((place) => (
                    <PlaceCard
                      key={place.id}
                      place={place}
                      origin={planner.origin ?? place}
                      isSelected={selectedIds.has(place.id)}
                      isDisabled={planner.selected.length >= 5}
                      onSelect={planner.togglePlace}
                    />
                  ))
                ) : (
                  <div className="list-message">
                    이 반경에는 장소가 없어요.
                    <br />
                    반경이나 종류를 바꿔보세요.
                  </div>
                )
              ) : (
                <div className="list-message">
                  시작점을 정하면
                  <br />
                  주변의 좋은 곳들이 나타나요.
                </div>
              )}
            </div>
          </section>
          <footer className="discover-footer">
            <Leaf size={14} /> 가까이서 발견하는 나만의 취향
          </footer>
        </aside>
        <section
          id="map-view"
          className="map-panel"
          aria-label="여행 지도"
          aria-hidden={activeView !== 'map'}
          inert={activeView !== 'map'}
          data-active={activeView === 'map'}
        >
          <MapComponent
            ref={routeMap}
            origin={planner.origin}
            destination={planner.destination}
            places={places}
            selected={planner.selected}
            itinerary={planner.itinerary}
            onSelect={(place) => {
              planner.togglePlace(place);
              setActiveView('discover');
            }}
          />
          <div className="map-top-label">
            <span className="live-dot" />
            {planner.origin ? `${planner.origin.name} 주변` : '오늘은 어디로 떠날까요?'}
            <span className="map-label-divider" />
            {demo ? '예시 동네' : '카카오맵'}
          </div>
          <div className="map-legend">
            <span>
              <i className="legend-food" />
              맛집
            </span>
            <span>
              <i className="legend-cafe" />
              카페
            </span>
            <span>
              <i className="legend-place" />갈 만한 곳
            </span>
          </div>
          {!planner.itinerary ? (
            <div className="map-note">
              <span className="map-note-icon">
                <Route size={22} />
              </span>
              <div>
                <strong>좋아하는 곳을 점으로, 하루를 선으로.</strong>
                <p>목록이나 지도에서 장소를 담아 동선을 만들어보세요.</p>
              </div>
            </div>
          ) : (
            <div className="map-note compact">
              <Footprints size={18} />
              <strong>
                {planner.itinerary.demo
                  ? '점선은 예시 방문 순서예요.'
                  : '도보는 실선, 대중교통은 점선으로 표시해요.'}
              </strong>
            </div>
          )}
          <Dialog
            open={showRouteDetails}
            onOpenChange={(open) => {
              sheetReturnTarget.current = 'trigger';
              setShowRouteDetails(open);
            }}
          >
            <div className="map-next-action">
              {planner.itinerary ? (
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <ListOrdered size={17} /> 이동 안내 보기
                  </Button>
                </DialogTrigger>
              ) : (
                <Button className="w-full" onClick={() => setActiveView('discover')}>
                  <ListOrdered size={17} /> 장소 선택으로 돌아가기
                </Button>
              )}
            </div>
            <DialogContent
              placement="bottom"
              className="route-sheet h-[64dvh] overflow-hidden px-5 pt-6 pb-[max(16px,env(safe-area-inset-bottom))]"
              onCloseAutoFocus={(event) => {
                if (sheetReturnTarget.current === 'trigger') return;
                event.preventDefault();
                const target = sheetReturnTarget.current === 'map' ? mapTab : discoverTab;
                target.current?.focus({ preventScroll: true });
              }}
            >
              <DialogTitle className="sr-only">이동 안내</DialogTitle>
              <DialogDescription className="sr-only">
                구간을 선택하면 안내를 닫고 지도에서 이동 경로를 보여줘요.
              </DialogDescription>
              <RouteSummary
                activeRoute={activeRoute}
                onFocusRoute={handleRouteFocus}
                onEdit={() => {
                  sheetReturnTarget.current = 'discover';
                  setShowRouteDetails(false);
                  setActiveView('discover');
                }}
                origin={planner.origin}
                destination={planner.destination}
                itinerary={planner.itinerary}
                initiallyExpanded
              />
            </DialogContent>
          </Dialog>
        </section>
      </main>
      {activeView === 'discover' ? (
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
