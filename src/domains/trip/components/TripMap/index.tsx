import './style.css';
import type { ComponentProps } from 'react';
import { Route, Footprints } from 'lucide-react';
import { DemoMap } from '../DemoMap';
import { KakaoMap } from '../KakaoMap';
import { useI18n } from '@/common/i18n/components/I18nProvider';

type Props = ComponentProps<typeof KakaoMap> & { demo: boolean };
export function TripMap({
  demo,
  ref,
  origin,
  destination,
  places,
  selected,
  itinerary,
  onShowEntireRoute,
  onSelect,
}: Props) {
  const { t } = useI18n();
  const MapComponent = demo ? DemoMap : KakaoMap;
  return (
    <>
      <MapComponent
        ref={ref}
        origin={origin}
        destination={destination}
        places={places}
        selected={selected}
        itinerary={itinerary}
        onShowEntireRoute={onShowEntireRoute}
        onSelect={onSelect}
      />
      <div className="map-top-label">
        <span className="live-dot" />
        {origin ? t('map.around', { name: origin.name }) : t('map.question')}
        <span className="map-label-divider" />
        {demo ? t('map.demoNeighborhood') : t('map.kakao')}
      </div>
      <div className="map-legend">
        <span>
          <i className="legend-food" aria-hidden="true">
            F
          </i>
          {t('category.restaurant')}
        </span>
        <span>
          <i className="legend-cafe" aria-hidden="true">
            C
          </i>
          {t('category.cafe')}
        </span>
        <span>
          <i className="legend-place" aria-hidden="true">
            P
          </i>{' '}
          {t('category.attraction')}
        </span>
        <span>
          <i className="legend-bar" aria-hidden="true">
            B
          </i>{' '}
          {t('category.bar')}
        </span>
      </div>
      {!itinerary ? (
        <div className="map-note">
          <span className="map-note-icon">
            <Route size={22} />
          </span>
          <div>
            <strong>{t('map.noteTitle')}</strong>
            <p>{t('map.noteDescription')}</p>
          </div>
        </div>
      ) : (
        <div className="map-note compact">
          <Footprints size={18} />
          <strong>{itinerary.demo ? t('map.demoRoute') : t('map.routeLegend')}</strong>
        </div>
      )}
    </>
  );
}
