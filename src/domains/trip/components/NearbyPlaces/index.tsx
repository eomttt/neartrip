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
import { useI18n } from '@/common/i18n/components/I18nProvider';
import { localizeTripText } from '../../i18n/localize-trip-text';

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
  const { locale, t } = useI18n();
  const [draftFilters, setDraftFilters] = useState<FilterSelection>(() => ({
    categories: [...selectedCategories],
    radius,
    crowdingLevels: [...crowdingLevels],
    petOnly,
    festivalOnly,
  }));
  const week = koreaWeekRange();
  const formatDay = (date: string) =>
    locale === 'ko'
      ? `${Number(date.slice(4, 6))}.${Number(date.slice(6, 8))}`
      : `${Number(date.slice(4, 6))}/${Number(date.slice(6, 8))}`;
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
        <h2 id="nearby-title">{t('nearby.title')}</h2>
        <Dialog onOpenChange={handleFilterSheetOpenChange}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="nearby-filter-trigger"
              aria-label={
                activeFilterCount > 0
                  ? t('filters.applied', { count: activeFilterCount })
                  : t('filters.label')
              }
            >
              <SlidersHorizontal size={15} />
              {t('filters.button')}
              {activeFilterCount > 0 ? <span aria-hidden="true">{activeFilterCount}</span> : null}
            </Button>
          </DialogTrigger>
          <DialogContent placement="bottom" className="nearby-filter-sheet">
            <div className="nearby-filter-heading">
              <DialogTitle>{t('filters.label')}</DialogTitle>
              <DialogDescription>{t('filters.description')}</DialogDescription>
            </div>
            <div className="nearby-filter-radius">
              <span>{t('filters.radius')}</span>
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
                  {t('filters.showPlaces')}
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="results-caption">
        <span>
          {demo
            ? t('nearby.demoPlaces')
            : festivalOnly && places.length === 0 && recommendations.length > 0
              ? t('nearby.recommendedFestivals')
              : festivalOnly
                ? t('nearby.weeklyFestivals')
                : t('nearby.nearPlaces')}{' '}
          <strong>{t('nearby.count', { count: resultCount })}</strong>
        </span>
        <span>{t('nearby.distanceOrder')}</span>
      </div>
      <div
        className="place-list"
        role="region"
        aria-label={t('nearby.region')}
        tabIndex={0}
        aria-busy={isFetching}
      >
        {festivalOnly ? (
          <p className="tourism-source">
            {demo ? t('nearby.sampleData') : t('nearby.tourApi')} ·{' '}
            {t('nearby.weekRange', {
              start: formatDay(week.start),
              end: formatDay(week.end),
            })}
          </p>
        ) : null}
        {isFetching ? (
          <div className="list-message" role="status">
            <span className="spinner" /> {t('nearby.loading')}
          </div>
        ) : error ? (
          <div className="list-message" role="alert">
            <p>{localizeTripText(locale, error.message)}</p>
            <Button onClick={() => onRetry()}>{t('nearby.retry')}</Button>
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
                <strong>{t('nearby.recommendationTitle')}</strong>
                <span>{t('nearby.recommendationDescription')}</span>
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
              {hasMore ? t('nearby.noMatchMore') : t('nearby.noMatch')}
              <br />
              {t('nearby.changeFilter')}
            </div>
          )
        ) : (
          <div className="list-message">{t('nearby.chooseOrigin')}</div>
        )}
        {loadMoreError ? (
          <p role="alert" className="tourism-source">
            {localizeTripText(locale, loadMoreError.message)}
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
              ? t('nearby.loadingMore')
              : loadMoreError
                ? t('nearby.retryMore')
                : festivalOnly
                  ? t('nearby.moreFestival')
                  : t('nearby.morePet')}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
