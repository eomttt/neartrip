import './style.css';
import { koreaWeekRange } from '../../utils/korea-date';
import type { CrowdingByPlace, CrowdingLevel } from '../../models/model-crowding';
import { Button } from '@/common/design-system/components/Button';
import type { Category, Place } from '../../models/model-trip';
import { PlaceCard } from '../PlaceCard';
import { PlaceFilters, PlaceRadiusSelect } from '../PlaceFilters';
interface Props {
  crowdingByPlace: CrowdingByPlace;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMoreError: Error | null;
  onLoadMore: () => void;
  demo: boolean;
  origin: Place | null;
  selected: Place[];
  places: Place[];
  recommendations: Place[];
  categories: Category[];
  radius: number;
  crowdingLevels: CrowdingLevel[];
  petOnly: boolean;
  festivalOnly: boolean;
  isFetching: boolean;
  error: Error | null;
  onCategoryToggle: (category: Category) => void;
  onCrowdingLevelToggle: (level: CrowdingLevel) => void;
  onPetOnlyChange: () => void;
  onFestivalOnlyChange: () => void;
  onRadiusChange: (radius: number) => void;
  onRetry: () => void;
  onSelect: (place: Place) => void;
}
export function NearbyPlaces({
  crowdingByPlace,
  hasMore,
  isLoadingMore,
  loadMoreError,
  onLoadMore,
  demo,
  origin,
  selected,
  places,
  recommendations,
  categories: selectedCategories,
  radius,
  crowdingLevels,
  petOnly,
  festivalOnly,
  isFetching,
  error,
  onCategoryToggle,
  onCrowdingLevelToggle,
  onPetOnlyChange,
  onFestivalOnlyChange,
  onRadiusChange,
  onRetry,
  onSelect,
}: Props) {
  const week = koreaWeekRange();
  const formatDay = (date: string) => `${Number(date.slice(4, 6))}.${Number(date.slice(6, 8))}`;
  const selectedIds = new Set(selected.map((place) => place.id));
  const resultCount = places.length > 0 ? places.length : recommendations.length;
  return (
    <section className="nearby-section" aria-labelledby="nearby-title">
      <div className="section-heading">
        <h2 id="nearby-title">오늘 들러볼 곳</h2>
        <PlaceRadiusSelect
          id="search-radius"
          radius={radius}
          festivalOnly={festivalOnly}
          onRadiusChange={onRadiusChange}
        />
      </div>
      <PlaceFilters
        categories={selectedCategories}
        crowdingLevels={crowdingLevels}
        petOnly={petOnly}
        festivalOnly={festivalOnly}
        onCategoryToggle={onCategoryToggle}
        onCrowdingLevelToggle={onCrowdingLevelToggle}
        onPetOnlyChange={onPetOnlyChange}
        onFestivalOnlyChange={onFestivalOnlyChange}
      />
      <div className="results-caption">
        <span>
          {demo
            ? '예시 장소'
            : festivalOnly && places.length === 0 && recommendations.length > 0
              ? '가까운 행사 추천'
              : festivalOnly
                ? '이번 주 행사'
                : '가까운 장소'}{' '}
          <strong>{resultCount}</strong>곳
        </span>
        <span>직선거리순</span>
      </div>
      <div
        className="place-list"
        role="region"
        aria-label="주변 장소 목록"
        tabIndex={0}
        aria-busy={isFetching}
      >
        {festivalOnly ? (
          <p className="tourism-source">
            {demo ? '예시 데이터' : '한국관광공사 TourAPI'} · {formatDay(week.start)} ~{' '}
            {formatDay(week.end)}(일) · 한국 시간 기준
          </p>
        ) : null}
        {isFetching ? (
          <div className="list-message" role="status">
            <span className="spinner" /> 주변 장소를 찾고 있어요.
          </div>
        ) : error ? (
          <div className="list-message" role="alert">
            <p>{error.message}</p>
            <Button onClick={() => onRetry()}>다시 찾기</Button>
          </div>
        ) : origin ? (
          places.length > 0 ? (
            places.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                crowding={crowdingByPlace[place.id]}
                origin={origin ?? place}
                isSelected={selectedIds.has(place.id)}
                isDisabled={selected.length >= 5}
                onSelect={onSelect}
              />
            ))
          ) : recommendations.length > 0 ? (
            <div className="festival-recommendations">
              <div className="recommendation-heading">
                <strong>이번 주에 열리는 가까운 행사</strong>
                <span>선택한 반경에 결과가 없어 가까운 순서로 추천해요.</span>
              </div>
              {recommendations.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  crowding={crowdingByPlace[place.id]}
                  origin={origin}
                  isSelected={selectedIds.has(place.id)}
                  isDisabled={selected.length >= 5}
                  onSelect={onSelect}
                />
              ))}
            </div>
          ) : (
            <div className="list-message">
              {hasMore
                ? '아직 조건에 맞는 장소를 찾지 못했어요.'
                : '이 반경에서 조건에 맞는 장소를 찾지 못했어요.'}
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
        {loadMoreError ? (
          <p role="alert" className="tourism-source">
            {loadMoreError.message}
          </p>
        ) : null}
        {hasMore && !isFetching ? (
          <Button
            variant="outline"
            className="my-3 w-full"
            disabled={isLoadingMore}
            onClick={onLoadMore}
          >
            {isLoadingMore
              ? '더 찾는 중…'
              : loadMoreError
                ? '더 찾기 재시도'
                : festivalOnly
                  ? '다른 행사 더 찾기'
                  : '반려견 동반 장소 더 찾기'}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
