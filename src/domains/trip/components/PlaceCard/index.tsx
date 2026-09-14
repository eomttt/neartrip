import './style.css';
import { CrowdingBadge } from '../CrowdingBadge';
import type { Crowding } from '../../models/model-crowding';
import { Button } from '@/common/design-system/components/Button';
import {
  Check,
  PawPrint,
  Coffee,
  ExternalLink,
  Footprints,
  Leaf,
  Plus,
  UtensilsCrossed,
  Wine,
} from 'lucide-react';
import { categoryLabels, type Category, type Place } from '../../models/model-trip';
import { getKakaoPlaceDetailUrl } from '../../utils/place-detail';
import { distanceMeters, formatDistance } from '../../utils/route-order';

interface Props {
  crowding?: Crowding;
  place: Place;
  origin: Place;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (place: Place) => void;
}

const categoryIcons: Record<Category, typeof Coffee> = {
  restaurant: UtensilsCrossed,
  cafe: Coffee,
  attraction: Leaf,
  bar: Wine,
};

export function PlaceCard({ place, origin, isSelected, isDisabled, onSelect, crowding }: Props) {
  const detailUrl = getKakaoPlaceDetailUrl(place.url);
  const Icon = categoryIcons[place.category];
  return (
    <article className={`place-card ${isSelected ? 'is-selected' : ''}`}>
      <div className={`place-art art-${place.category}`} aria-hidden="true">
        <Icon className="size-6" strokeWidth={1.4} />
      </div>
      <div className="place-copy">
        <div className="place-title">
          <h3>{place.name}</h3>
          <span className="category-label">{categoryLabels[place.category]}</span>
        </div>
        <p className="place-address">{place.address}</p>
        <div className="place-meta">
          <span className="distance">
            <Footprints className="size-3" aria-hidden="true" />
            직선 {formatDistance(distanceMeters(origin, place))}
          </span>
          {detailUrl ? (
            <a
              className="place-detail-link"
              href={detailUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${place.name} 카카오맵 후기·상세 (새 창)`}
            >
              후기·상세 <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          ) : null}
        </div>
        {place.tourism?.kind === 'festival' && place.description ? (
          <p className="place-description">{place.description}</p>
        ) : null}
        {place.tourism ? (
          <div className="tourism-details">
            {place.tourism.kind === 'pet' ? (
              <span className="pet-badge">
                <PawPrint className="size-3" aria-hidden="true" />
                반려견 동반
              </span>
            ) : null}
            {place.tourism.period ? (
              <p>개최 기간 {place.tourism.period.replace(/(\d{4})(\d{2})(\d{2})/g, '$1.$2.$3')}</p>
            ) : null}
            {place.tourism.conditions ? (
              <details>
                <summary>
                  {place.tourism.kind === 'pet' ? '반려견 동반 조건' : '운영 시간 보기'}
                </summary>
                <p>{place.tourism.conditions}</p>
                {place.tourism.kind === 'pet' ? (
                  <p>한국관광공사 TourAPI · 입장 조건은 방문 전 확인해주세요.</p>
                ) : null}
              </details>
            ) : null}
          </div>
        ) : null}
        {crowding ? <CrowdingBadge crowding={crowding} /> : null}
      </div>
      <Button
        variant={isSelected ? 'default' : 'outline'}
        size="icon-sm"
        className="add-place size-10 rounded-full"
        aria-label={`${place.name} ${isSelected ? '빼기' : '담기'}`}
        aria-pressed={isSelected}
        disabled={isDisabled && !isSelected}
        onClick={() => onSelect(place)}
      >
        {isSelected ? <Check size={17} /> : <Plus size={17} />}
      </Button>
    </article>
  );
}
