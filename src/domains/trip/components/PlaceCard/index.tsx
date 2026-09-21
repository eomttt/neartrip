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
import type { Category, Place } from '../../models/model-trip';
import { getKakaoPlaceDetailUrl } from '../../utils/place-detail';
import { distanceMeters, formatDistance } from '../../utils/route-order';
import { useI18n } from '@/common/i18n/components/I18nProvider';
import { categoryMessageKeys } from '../../i18n/trip-message-keys';
import { localizeTripText } from '../../i18n/localize-trip-text';

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
  const { locale, t } = useI18n();
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
          <span className="category-label">{t(categoryMessageKeys[place.category])}</span>
        </div>
        <p className="place-address">{place.address}</p>
        <div className="place-meta">
          <span className="distance">
            <Footprints className="size-3" aria-hidden="true" />
            {t('place.straightDistance', {
              distance: formatDistance(distanceMeters(origin, place)),
            })}
          </span>
          {detailUrl ? (
            <a
              className="place-detail-link"
              href={detailUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('place.detailLabel', { name: place.name })}
            >
              {t('place.detail')} <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          ) : null}
        </div>
        {place.tourism?.kind === 'festival' && place.description ? (
          <p className="place-description">{localizeTripText(locale, place.description)}</p>
        ) : null}
        {place.tourism ? (
          <div className="tourism-details">
            {place.tourism.kind === 'pet' ? (
              <span className="pet-badge">
                <PawPrint className="size-3" aria-hidden="true" />
                {t('place.pet')}
              </span>
            ) : null}
            {place.tourism.period ? (
              <p>
                {t('place.period', {
                  period: place.tourism.period.replace(/(\d{4})(\d{2})(\d{2})/g, '$1.$2.$3'),
                })}
              </p>
            ) : null}
            {place.tourism.conditions ? (
              <details>
                <summary>
                  {place.tourism.kind === 'pet' ? t('place.petConditions') : t('place.hours')}
                </summary>
                <p>{place.tourism.conditions}</p>
                {place.tourism.kind === 'pet' ? <p>{t('place.petSource')}</p> : null}
              </details>
            ) : null}
          </div>
        ) : null}
        {crowding ? <CrowdingBadge crowding={crowding} /> : null}
      </div>
      <Button
        variant={isSelected ? 'default' : 'outline'}
        size="icon-sm"
        className="add-place size-9 rounded-xl shadow-none"
        aria-label={t(isSelected ? 'place.remove' : 'place.add', { name: place.name })}
        aria-pressed={isSelected}
        disabled={isDisabled && !isSelected}
        onClick={() => onSelect(place)}
      >
        {isSelected ? <Check size={17} /> : <Plus size={17} />}
      </Button>
    </article>
  );
}
