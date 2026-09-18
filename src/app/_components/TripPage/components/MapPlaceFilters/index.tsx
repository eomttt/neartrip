import './style.css';
import { SlidersHorizontal } from 'lucide-react';
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
import {
  PlaceFilters,
  PlaceRadiusSelect,
  type PlaceFilterProps,
  type PlaceRadiusSelectProps,
} from '@/domains/trip/components/PlaceFilters';
import { useI18n } from '@/common/i18n/components/I18nProvider';

type Props = PlaceFilterProps &
  Omit<PlaceRadiusSelectProps, 'id'> & {
    placeCount: number;
    selectedCount: number;
  };

export function MapPlaceFilters({ placeCount, selectedCount, ...filters }: Props) {
  const { t } = useI18n();
  return (
    <Dialog>
      <div className="map-filter-action">
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-label={t('map.filterCount', { count: placeCount })}
          >
            <SlidersHorizontal size={15} />
            {t('filters.button')}
            <span>{placeCount}</span>
          </Button>
        </DialogTrigger>
      </div>
      <DialogContent placement="bottom" className="map-filter-sheet">
        <div className="map-filter-heading">
          <div>
            <DialogTitle>{t('map.filtersTitle')}</DialogTitle>
            <DialogDescription>{t('map.filtersDescription')}</DialogDescription>
          </div>
          <PlaceRadiusSelect
            id="map-search-radius"
            radius={filters.radius}
            onRadiusChange={filters.onRadiusChange}
          />
        </div>
        <PlaceFilters {...filters} />
        <div className="map-filter-status" aria-live="polite">
          <span>{t('map.displayed', { count: placeCount })}</span>
          <span>{t('map.selected', { count: selectedCount })}</span>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button className="w-full">{t('map.view')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
