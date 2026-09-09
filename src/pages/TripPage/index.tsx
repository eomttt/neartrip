import { useMemo, useState } from 'react';
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
  Route,
  Search,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { searchTripQueries } from '../../domains/trip/queries/searchTripQueries';
import { categoryLabels, type Category, type Place } from '../../domains/trip/models/model-trip';
import { useTripPlanner } from '../../domains/trip/hooks/useTripPlanner';
import { PlaceCard } from '../../domains/trip/components/PlaceCard';
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
            <button onClick={() => config.refetch()}>다시 연결하기</button>
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
        .filter((place) => place.id !== planner.origin?.id)
        .toSorted((a, b) =>
          planner.origin
            ? distanceMeters(planner.origin, a) - distanceMeters(planner.origin, b)
            : 0,
        ),
    [nearby.data, planner.origin],
  );
  const selectedIds = new Set(planner.selected.map((place) => place.id));
  const MapComponent = demo ? DemoMap : KakaoMap;
  function handleOriginSelect(place: Place) {
    planner.changeOrigin(place);
    setShowSearch(false);
    setInput('');
    setQuery('');
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
        <button
          className="help-button"
          onClick={() => setShowHelp((current) => !current)}
          aria-expanded={showHelp}
        >
          <Compass size={16} /> 이용 방법
        </button>
      </header>
      {showHelp ? (
        <section className="help-banner">
          <strong>장소 하나에서 시작하는 작은 여행</strong>
          <p>
            출발할 장소를 검색하고 주변에서 마음에 드는 곳을 5곳까지 담아주세요. 동선을 만든 뒤
            화살표로 순서를 바꿀 수 있어요. 날짜·영업시간·체류시간은 이번 버전에 포함되지 않습니다.
          </p>
          <button aria-label="이용 방법 닫기" onClick={() => setShowHelp(false)}>
            <X size={17} />
          </button>
        </section>
      ) : null}
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
      <main className="planner-layout">
        <aside className="discover-panel" aria-label="장소 찾기와 선택">
          <div className="discover-intro">
            <span className="eyebrow">
              <span className="tiny-line" /> A DAY, CLOSE BY
            </span>
            <h1>
              가까운 곳에서
              <br />
              발견하는 <span>좋은 하루.</span>
            </h1>
            <p>
              어디서 시작할까요?
              <br />
              마음에 드는 곳만 담으면, 길은 이어드릴게요.
            </p>
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
            <input
              id="origin-search"
              value={input}
              maxLength={80}
              onChange={(event) => setInput(event.target.value)}
              placeholder={demo ? '예시: 성수역, 작은 식탁' : '숙소, 역 이름, 주소로 검색'}
            />
            <button type="submit" aria-label="장소 검색" disabled={!input.trim()}>
              <ArrowRight size={18} />
            </button>
          </form>
          {showSearch ? (
            <section className="search-results" aria-label="출발 장소 검색 결과">
              <div className="search-results-heading">
                <strong>여기서 출발할까요?</strong>
                <button aria-label="검색 결과 닫기" onClick={() => setShowSearch(false)}>
                  <X size={15} />
                </button>
              </div>
              {search.isFetching ? (
                <p role="status">장소를 찾고 있어요.</p>
              ) : search.error ? (
                <p role="alert">{search.error.message}</p>
              ) : search.data?.length ? (
                search.data.map((place) => (
                  <button
                    className="search-result"
                    key={place.id}
                    onClick={() => handleOriginSelect(place)}
                  >
                    <MapPin size={16} />
                    <span>
                      <strong>{place.name}</strong>
                      <small>{place.address}</small>
                    </span>
                    <ArrowRight size={15} />
                  </button>
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
          ) : null}
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
              <MapPin size={18} /> 출발할 장소를 먼저 검색해주세요.
            </div>
          )}
          <section className="nearby-section" aria-labelledby="nearby-title">
            <div className="section-heading">
              <h2 id="nearby-title">주변을 둘러보세요</h2>
              <label className="radius-select">
                <span className="sr-only">검색 반경</span>
                <select value={radius} onChange={(event) => setRadius(Number(event.target.value))}>
                  <option value={500}>반경 500m</option>
                  <option value={1000}>반경 1km</option>
                  <option value={2000}>반경 2km</option>
                  <option value={3000}>반경 3km</option>
                </select>
              </label>
            </div>
            <div className="category-filters" role="group" aria-label="장소 종류">
              <button
                className={!category ? 'active' : ''}
                aria-pressed={!category}
                onClick={() => setCategory(undefined)}
              >
                전체
              </button>
              {categories.map(({ value, Icon }) => (
                <button
                  key={value}
                  className={category === value ? 'active' : ''}
                  aria-pressed={category === value}
                  onClick={() => setCategory(value)}
                >
                  <Icon size={14} />
                  {categoryLabels[value]}
                </button>
              ))}
            </div>
            <div className="results-caption">
              <span>
                {demo ? '예시 장소' : '가까운 장소'} <strong>{places.length}</strong>곳
              </span>
              <span>직선거리순</span>
            </div>
            <div className="place-list" aria-busy={nearby.isFetching}>
              {nearby.isFetching ? (
                <div className="list-message" role="status">
                  <span className="spinner" /> 주변 장소를 찾고 있어요.
                </div>
              ) : nearby.error ? (
                <div className="list-message" role="alert">
                  <p>{nearby.error.message}</p>
                  <button onClick={() => nearby.refetch()}>다시 찾기</button>
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
        <section className="map-panel" aria-label="여행 지도">
          <MapComponent
            origin={planner.origin}
            places={places}
            selected={planner.selected}
            itinerary={planner.itinerary}
            onSelect={planner.togglePlace}
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
                  : '도보는 점선, 대중교통은 실선으로 표시해요.'}
              </strong>
            </div>
          )}
        </section>
        <aside className="itinerary-sidebar" aria-label="내 여행 일정">
          <div className="itinerary-top">
            <span>YOUR DAY, YOUR WAY</span>
            <span className="sun-symbol">✳</span>
          </div>
          <RouteSummary
            origin={planner.origin}
            selected={planner.selected}
            itinerary={planner.itinerary}
            isPlanning={planner.isPlanning}
            onRemove={planner.togglePlace}
            onMove={planner.movePlace}
            onReset={planner.resetPlaces}
            onBuild={planner.buildPlan}
          />
          {planner.error ? (
            <div className="error-message" role="alert">
              <Info size={16} />
              <p>{planner.error}</p>
            </div>
          ) : null}
          <div className="slow-note">
            <span className="slow-drawing" aria-hidden="true">
              ✳
            </span>
            <p>
              빽빽한 계획보다,
              <br />
              발길이 머무는 여행.
            </p>
            <span>조금 느려도 괜찮아요.</span>
          </div>
        </aside>
      </main>
    </div>
  );
}
