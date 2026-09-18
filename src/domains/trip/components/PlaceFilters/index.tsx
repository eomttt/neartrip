import './style.css';
import { CalendarDays, Coffee, Leaf, PawPrint, UtensilsCrossed, Wine } from 'lucide-react';
import { Button } from '@/common/design-system/components/Button';
import { NativeSelect, NativeSelectOption } from '@/common/design-system/components/NativeSelect';
import { crowdingLevelSchema, type CrowdingLevel } from '../../models/model-crowding';
import type { Category } from '../../models/model-trip';
import { useI18n } from '@/common/i18n/components/I18nProvider';
import { categoryMessageKeys, crowdingMessageKeys } from '../../i18n/trip-message-keys';

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
  onRadiusChange: (radius: number) => void;
}

export function PlaceRadiusSelect({ id, radius, onRadiusChange }: PlaceRadiusSelectProps) {
  const { t } = useI18n();
  function radiusLabel(distance: string) {
    return t('filters.radiusOption', { distance });
  }
  return (
    <div className="radius-select">
      <label className="sr-only" htmlFor={id}>
        {t('filters.radius')}
      </label>
      <NativeSelect
        id={id}
        size="sm"
        className="text-xs"
        value={radius}
        onChange={(event) => onRadiusChange(Number(event.target.value))}
      >
        <NativeSelectOption value={500}>{radiusLabel('500m')}</NativeSelectOption>
        <NativeSelectOption value={1000}>{radiusLabel('1km')}</NativeSelectOption>
        <NativeSelectOption value={2000}>{radiusLabel('2km')}</NativeSelectOption>
        <NativeSelectOption value={3000}>{radiusLabel('3km')}</NativeSelectOption>
        <NativeSelectOption value={5000}>{radiusLabel('5km')}</NativeSelectOption>
        <NativeSelectOption value={10000}>{radiusLabel('10km')}</NativeSelectOption>
        <NativeSelectOption value={20000}>{radiusLabel('20km')}</NativeSelectOption>
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
  const { t } = useI18n();
  return (
    <div className="place-filters" aria-label={t('filters.label')}>
      <div className="filter-row">
        <span className="filter-label">{t('filters.category')}</span>
        <div className="filter-options" role="group" aria-label={t('filters.categoryGroup')}>
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
              {t(categoryMessageKeys[value])}
            </Button>
          ))}
        </div>
      </div>
      <div className="filter-row">
        <span className="filter-label">{t('filters.crowding')}</span>
        <div className="filter-options" role="group" aria-label={t('filters.crowdingGroup')}>
          {crowdingLevelSchema.options.map((level) => (
            <Button
              key={level}
              variant={crowdingLevels.includes(level) ? 'default' : 'outline'}
              size="sm"
              className="px-2 text-xs"
              aria-pressed={crowdingLevels.includes(level)}
              onClick={() => onCrowdingLevelToggle(level)}
            >
              {t(crowdingMessageKeys[level])}
            </Button>
          ))}
        </div>
      </div>
      <div className="filter-row">
        <span className="filter-label">{t('filters.conditions')}</span>
        <div className="filter-options" role="group" aria-label={t('filters.conditionsGroup')}>
          <Button
            variant={petOnly ? 'default' : 'outline'}
            size="sm"
            className="px-2 text-xs"
            aria-pressed={petOnly}
            onClick={onPetOnlyChange}
          >
            <PawPrint size={14} />
            {t('filters.pet')}
          </Button>
          <Button
            variant={festivalOnly ? 'default' : 'outline'}
            size="sm"
            className="px-2 text-xs"
            aria-pressed={festivalOnly}
            onClick={onFestivalOnlyChange}
          >
            <CalendarDays size={14} />
            {t('filters.festival')}
          </Button>
        </div>
      </div>
    </div>
  );
}
