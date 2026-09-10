import { Button } from '@/common/design-system/components/Button';
import { Check, Coffee, ExternalLink, Footprints, Leaf, Plus, UtensilsCrossed } from 'lucide-react';
import { categoryLabels, type Place } from '../../models/model-trip';
import { distanceMeters, formatDistance } from '../../utils/route-order';

interface Props {
  place: Place;
  origin: Place;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (place: Place) => void;
}

export function PlaceCard({ place, origin, isSelected, isDisabled, onSelect }: Props) {
  const detailUrl = /^https?:\/\/place\.map\.kakao\.com\/\d+\/?$/.test(place.url)
    ? place.url.replace(/^http:/, 'https:')
    : null;
  const Icon =
    place.category === 'restaurant' ? UtensilsCrossed : place.category === 'cafe' ? Coffee : Leaf;
  return (
    <article className={`place-card ${isSelected ? 'is-selected' : ''}`}>
      <div className={`place-art art-${place.category}`} aria-hidden="true">
        <span className="art-ring" />
        <Icon size={30} strokeWidth={1.4} />
        <span className="art-spark">✳</span>
      </div>
      <div className="place-copy">
        <span className={`category-label text-${place.category}`}>
          {categoryLabels[place.category]}
        </span>
        <h3>{place.name}</h3>
        <p>{place.description}</p>
        <p className="place-address">{place.address}</p>
        <span className="distance">
          <Footprints size={12} /> 직선 {formatDistance(distanceMeters(origin, place))}
        </span>
        {detailUrl ? (
          <Button asChild variant="link" className="mt-1 h-auto justify-start gap-1 p-0 text-xs">
            <a
              href={detailUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${place.name} 카카오맵 후기·상세 (새 창)`}
            >
              카카오맵 후기·상세 <ExternalLink size={12} />
            </a>
          </Button>
        ) : null}
      </div>
      <Button
        variant={isSelected ? 'default' : 'outline'}
        size="icon-sm"
        className="add-place rounded-full"
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
