import './style.css';
import { CalendarDays, Coffee, Leaf, PawPrint, UtensilsCrossed, Wine } from 'lucide-react';
import { Button } from '@/common/design-system/components/Button';
import { NativeSelect, NativeSelectOption } from '@/common/design-system/components/NativeSelect';
import { crowdingLevelSchema, type CrowdingLevel } from '../../models/model-crowding';
import { categoryLabels, type Category } from '../../models/model-trip';

const categoryOptions: { value: Category; Icon: typeof Coffee }[] = [
  { value: 'restaurant', Icon: UtensilsCrossed },
  { value: 'cafe', Icon: Coffee },
  { value: 'attraction', Icon: Leaf },
  { value: 'bar', Icon: Wine },
];

export interface PlaceFilterProps {
  categories: Category[];
  crowdingLevels: CrowdingLevel[];
  petOnly: boolean;
  festivalOnly: boolean;
  onCategoryToggle: (category: Category) => void;
  onCrowdingLevelToggle: (level: CrowdingLevel) => void;
  onPetOnlyChange: () => void;
  onFestivalOnlyChange: () => void;
}

export interface PlaceRadiusSelectProps {
  id: string;
  radius: number;
  festivalOnly: boolean;
  onRadiusChange: (radius: number) => void;
}

export function PlaceRadiusSelect({
  id,
  radius,
  festivalOnly,
  onRadiusChange,
}: PlaceRadiusSelectProps) {
  return (
    <div className="radius-select">
      <label className="sr-only" htmlFor={id}>
        검색 반경
      </label>
      <NativeSelect
        id={id}
        size="sm"
        className="text-xs"
        value={radius}
        onChange={(event) => onRadiusChange(Number(event.target.value))}
      >
        <NativeSelectOption value={500}>반경 500m</NativeSelectOption>
        <NativeSelectOption value={1000}>반경 1km</NativeSelectOption>
        <NativeSelectOption value={2000}>반경 2km</NativeSelectOption>
        <NativeSelectOption value={3000}>반경 3km</NativeSelectOption>
        {festivalOnly ? (
          <>
            <NativeSelectOption value={5000}>반경 5km</NativeSelectOption>
            <NativeSelectOption value={10000}>반경 10km</NativeSelectOption>
            <NativeSelectOption value={20000}>반경 20km</NativeSelectOption>
          </>
        ) : null}
      </NativeSelect>
    </div>
  );
}

export function PlaceFilters({
  categories,
  crowdingLevels,
  petOnly,
  festivalOnly,
  onCategoryToggle,
  onCrowdingLevelToggle,
  onPetOnlyChange,
  onFestivalOnlyChange,
}: PlaceFilterProps) {
  return (
    <div className="place-filters" aria-label="장소 필터">
      <div className="filter-row">
        <span className="filter-label">카테고리</span>
        <div className="filter-options" role="group" aria-label="카테고리 복수 선택">
          {categoryOptions.map(({ value, Icon }) => (
            <Button
              key={value}
              variant={categories.includes(value) ? 'default' : 'outline'}
              size="sm"
              className="px-2 text-xs"
              aria-pressed={categories.includes(value)}
              onClick={() => onCategoryToggle(value)}
            >
              <Icon size={14} />
              {categoryLabels[value]}
            </Button>
          ))}
        </div>
      </div>
      <div className="filter-row">
        <span className="filter-label">혼잡도</span>
        <div className="filter-options" role="group" aria-label="혼잡도 복수 선택">
          {crowdingLevelSchema.options.map((level) => (
            <Button
              key={level}
              variant={crowdingLevels.includes(level) ? 'default' : 'outline'}
              size="sm"
              className="px-2 text-xs"
              aria-pressed={crowdingLevels.includes(level)}
              onClick={() => onCrowdingLevelToggle(level)}
            >
              {level}
            </Button>
          ))}
        </div>
      </div>
      <div className="filter-row">
        <span className="filter-label">조건</span>
        <div className="filter-options" role="group" aria-label="장소 조건">
          <Button
            variant={petOnly ? 'default' : 'outline'}
            size="sm"
            className="px-2 text-xs"
            aria-pressed={petOnly}
            onClick={onPetOnlyChange}
          >
            <PawPrint size={14} />
            반려견 동반
          </Button>
          <Button
            variant={festivalOnly ? 'default' : 'outline'}
            size="sm"
            className="px-2 text-xs"
            aria-pressed={festivalOnly}
            onClick={onFestivalOnlyChange}
          >
            <CalendarDays size={14} />
            이번 주 행사
          </Button>
        </div>
      </div>
    </div>
  );
}
