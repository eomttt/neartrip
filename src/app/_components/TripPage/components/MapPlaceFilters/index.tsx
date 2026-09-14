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

type Props = PlaceFilterProps &
  Omit<PlaceRadiusSelectProps, 'id'> & {
    placeCount: number;
    selectedCount: number;
  };

export function MapPlaceFilters({ placeCount, selectedCount, ...filters }: Props) {
  return (
    <Dialog>
      <div className="map-filter-action">
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" aria-label={`장소 필터 ${placeCount}곳`}>
            <SlidersHorizontal size={15} />
            필터
            <span>{placeCount}</span>
          </Button>
        </DialogTrigger>
      </div>
      <DialogContent placement="bottom" className="map-filter-sheet">
        <div className="map-filter-heading">
          <div>
            <DialogTitle>지도에 표시할 장소</DialogTitle>
            <DialogDescription>
              필터를 바꾸면 지도 마커가 바로 바뀌어요. 마커를 눌러 방문지를 추가하세요.
            </DialogDescription>
          </div>
          <PlaceRadiusSelect
            id="map-search-radius"
            radius={filters.radius}
            festivalOnly={filters.festivalOnly}
            onRadiusChange={filters.onRadiusChange}
          />
        </div>
        <PlaceFilters {...filters} />
        <div className="map-filter-status" aria-live="polite">
          <span>지도에 {placeCount}곳 표시</span>
          <span>담은 장소 {selectedCount} / 5</span>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button className="w-full">지도에서 보기</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
