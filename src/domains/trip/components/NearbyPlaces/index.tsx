import './style.css';
import { Coffee, UtensilsCrossed, Leaf } from 'lucide-react';
import { Button } from '@/common/design-system/components/Button';
import { NativeSelect, NativeSelectOption } from '@/common/design-system/components/NativeSelect';
import { categoryLabels, type Category, type Place } from '../../models/model-trip';
import { PlaceCard } from '../PlaceCard';

const categories: { value: Category; Icon: typeof Coffee }[] = [
  { value: 'restaurant', Icon: UtensilsCrossed },
  { value: 'cafe', Icon: Coffee },
  { value: 'attraction', Icon: Leaf },
];
interface Props {
  demo: boolean;
  origin: Place | null;
  selected: Place[];
  places: Place[];
  category: Category | undefined;
  radius: number;
  isFetching: boolean;
  error: Error | null;
  onCategoryChange: (category: Category | undefined) => void;
  onRadiusChange: (radius: number) => void;
  onRetry: () => void;
  onSelect: (place: Place) => void;
}
export function NearbyPlaces({
  demo,
  origin,
  selected,
  places,
  category,
  radius,
  isFetching,
  error,
  onCategoryChange,
  onRadiusChange,
  onRetry,
  onSelect,
}: Props) {
  const selectedIds = new Set(selected.map((place) => place.id));
  return (
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
            onChange={(event) => onRadiusChange(Number(event.target.value))}
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
          onClick={() => onCategoryChange(undefined)}
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
            onClick={() => onCategoryChange(value)}
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
        aria-busy={isFetching}
      >
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
                origin={origin ?? place}
                isSelected={selectedIds.has(place.id)}
                isDisabled={selected.length >= 5}
                onSelect={onSelect}
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
  );
}
