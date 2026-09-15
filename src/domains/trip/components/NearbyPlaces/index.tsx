import './style.css';
import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { koreaWeekRange } from '../../utils/korea-date';
import {
  crowdingLevelSchema,
  type CrowdingByPlace,
  type CrowdingLevel,
} from '../../models/model-crowding';
import { Button } from '@/common/design-system/components/Button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/common/design-system/components/Dialog';
import { categorySchema, type Category, type Place } from '../../models/model-trip';
import { PlaceCard } from '../PlaceCard';
import { PlaceFilters, PlaceRadiusSelect } from '../PlaceFilters';

interface FilterSelection {
  categories: Category[];
  radius: number;
  crowdingLevels: CrowdingLevel[];
  petOnly: boolean;
  festivalOnly: boolean;
}

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
  const [draftFilters, setDraftFilters] = useState<FilterSelection>(() => ({
    categories: [...selectedCategories],
    radius,
    crowdingLevels: [...crowdingLevels],
    petOnly,
    festivalOnly,
  }));
  const week = koreaWeekRange();
  const formatDay = (date: string) => `${Number(date.slice(4, 6))}.${Number(date.slice(6, 8))}`;
  const selectedIds = new Set(selected.map((place) => place.id));
  const resultCount = places.length > 0 ? places.length : recommendations.length;
  const activeFilterCount =
    Number(selectedCategories.length !== categorySchema.options.length) +
    Number(radius !== 1_000) +
    Number(crowdingLevels.length > 0) +
    Number(petOnly || festivalOnly);

  function handleFilterSheetOpenChange(open: boolean) {
    if (!open) return;
    setDraftFilters({
      categories: [...selectedCategories],
      radius,
      crowdingLevels: [...crowdingLevels],
      petOnly,
      festivalOnly,
    });
  }

  function handleApplyFilters() {
    for (const category of categorySchema.options) {
      if (selectedCategories.includes(category) !== draftFilters.categories.includes(category)) {
        onCategoryToggle(category);
      }
    }
    for (const level of crowdingLevelSchema.options) {
      if (crowdingLevels.includes(level) !== draftFilters.crowdingLevels.includes(level)) {
        onCrowdingLevelToggle(level);
      }
    }
    if (draftFilters.petOnly) {
      if (!petOnly) onPetOnlyChange();
    } else if (draftFilters.festivalOnly) {
      if (!festivalOnly) onFestivalOnlyChange();
    } else if (petOnly) {
      onPetOnlyChange();
    } else if (festivalOnly) {
      onFestivalOnlyChange();
    }
    if (radius !== draftFilters.radius) onRadiusChange(draftFilters.radius);
  }

  return (
    <section className="nearby-section" aria-labelledby="nearby-title">
      <div className="section-heading">
        <h2 id="nearby-title">오늘 들러볼 곳</h2>
        <Dialog onOpenChange={handleFilterSheetOpenChange}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="nearby-filter-trigger"
              aria-label={
                activeFilterCount > 0 ? `장소 필터 ${activeFilterCount}개 적용` : '장소 필터'
              }
            >
              <SlidersHorizontal size={15} />
              필터
              {activeFilterCount > 0 ? <span aria-hidden="true">{activeFilterCount}</span> : null}
            </Button>
          </DialogTrigger>
          <DialogContent placement="bottom" className="nearby-filter-sheet">
            <div className="nearby-filter-heading">
              <DialogTitle>장소 필터</DialogTitle>
              <DialogDescription>
                장소 보기를 누르면 선택한 조건이 목록에 반영돼요.
              </DialogDescription>
            </div>
            <div className="nearby-filter-radius">
              <span>검색 반경</span>
              <PlaceRadiusSelect
                id="search-radius"
                radius={draftFilters.radius}
                festivalOnly={draftFilters.festivalOnly}
                onRadiusChange={(nextRadius) =>
                  setDraftFilters((current) => ({ ...current, radius: nextRadius }))
                }
              />
            </div>
            <PlaceFilters
              categories={draftFilters.categories}
              crowdingLevels={draftFilters.crowdingLevels}
              petOnly={draftFilters.petOnly}
              festivalOnly={draftFilters.festivalOnly}
              onCategoryToggle={(category) =>
                setDraftFilters((current) => ({
                  ...current,
                  categories: current.categories.includes(category)
                    ? current.categories.filter((value) => value !== category)
                    : [...current.categories, category],
                }))
              }
              onCrowdingLevelToggle={(level) =>
                setDraftFilters((current) => ({
                  ...current,
                  crowdingLevels: current.crowdingLevels.includes(level)
                    ? current.crowdingLevels.filter((value) => value !== level)
                    : [...current.crowdingLevels, level],
                }))
              }
              onPetOnlyChange={() =>
                setDraftFilters((current) => ({
                  ...current,
                  petOnly: !current.petOnly,
                  festivalOnly: false,
                  radius: Math.min(current.radius, 3_000),
                }))
              }
              onFestivalOnlyChange={() =>
                setDraftFilters((current) => ({
                  ...current,
                  festivalOnly: !current.festivalOnly,
                  petOnly: false,
                  radius: current.festivalOnly ? Math.min(current.radius, 3_000) : current.radius,
                }))
              }
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button className="w-full" onClick={handleApplyFilters}>
                  장소 보기
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
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
