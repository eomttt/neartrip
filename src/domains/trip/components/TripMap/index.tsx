import './style.css';
import type { ComponentProps } from 'react';
import { Route, Footprints } from 'lucide-react';
import { DemoMap } from '../DemoMap';
import { KakaoMap } from '../KakaoMap';

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
        {origin ? `${origin.name} 주변` : '오늘은 어디로 떠날까요?'}
        <span className="map-label-divider" />
        {demo ? '예시 동네' : '카카오맵'}
      </div>
      <div className="map-legend">
        <span>
          <i className="legend-food" />
          맛집
        </span>
        <span>
          <i className="legend-cafe" />
          카페
        </span>
        <span>
          <i className="legend-place" />갈 만한 곳
        </span>
        <span>
          <i className="legend-bar" />술 한잔
        </span>
      </div>
      {!itinerary ? (
        <div className="map-note">
          <span className="map-note-icon">
            <Route size={22} />
          </span>
          <div>
            <strong>좋아하는 곳을 점으로, 하루를 선으로.</strong>
            <p>목록이나 지도에서 장소를 담아 동선을 만들어보세요.</p>
          </div>
        </div>
      ) : (
        <div className="map-note compact">
          <Footprints size={18} />
          <strong>
            {itinerary.demo
              ? '점선은 예시 방문 순서예요.'
              : '도보는 실선, 대중교통은 점선으로 표시해요.'}
          </strong>
        </div>
      )}
    </>
  );
}
