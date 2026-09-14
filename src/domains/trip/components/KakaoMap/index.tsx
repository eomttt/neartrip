import { playRoute } from '../../utils/route-playback';
import type { RouteMapHandle } from '../../utils/route-highlight';
import { Button } from '@/common/design-system/components/Button';
import { useEffect, useEffectEvent, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Crosshair, Minus, Plus } from 'lucide-react';
import { loadKakaoMap } from '../../../../common/maps/kakao-loader';
import { categoryLabels, type Category, type Itinerary, type Place } from '../../models/model-trip';
import { getKakaoPlaceDetailUrl } from '../../utils/place-detail';
import { distanceMeters, formatDistance } from '../../utils/route-order';

const categoryPinLabels: Record<Category, string> = {
  restaurant: 'F',
  cafe: 'C',
  attraction: 'P',
  bar: 'B',
};

function createMapPlacePreview(place: Place, origin: Place | null, id: string): HTMLElement {
  const preview = document.createElement('article');
  preview.id = id;
  preview.className = 'map-place-preview';
  preview.setAttribute('role', 'tooltip');
  preview.setAttribute('aria-label', `${place.name} 장소 정보`);

  const category = document.createElement('span');
  category.className = 'map-place-preview-category';
  category.textContent = categoryLabels[place.category];
  const name = document.createElement('strong');
  name.textContent = place.name;
  const address = document.createElement('p');
  address.className = 'map-place-preview-address';
  address.textContent = place.address;
  const meta = document.createElement('div');
  meta.className = 'map-place-preview-meta';
  if (origin) {
    const distance = document.createElement('span');
    distance.textContent = `직선 ${formatDistance(distanceMeters(origin, place))}`;
    meta.append(distance);
  }
  const detailUrl = getKakaoPlaceDetailUrl(place.url);
  if (detailUrl) {
    const detail = document.createElement('a');
    detail.href = detailUrl;
    detail.target = '_blank';
    detail.rel = 'noopener noreferrer';
    detail.textContent = '후기·상세 ↗';
    detail.setAttribute('aria-label', `${place.name} 카카오맵 후기·상세 (새 창)`);
    meta.append(detail);
  }
  preview.append(category, name, address, meta);
  return preview;
}

interface Props {
  ref?: Ref<RouteMapHandle>;
  origin: Place | null;
  destination?: Place | null;
  places: Place[];
  selected: Place[];
  itinerary: Itinerary | null;
  onSelect: (place: Place) => void;
}

export function KakaoMap({
  ref,
  origin,
  destination,
  places,
  selected,
  itinerary,
  onSelect,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<kakao.maps.Map | null>(null);
  const bounds = useRef<kakao.maps.LatLngBounds | null>(null);
  const clearHighlight = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const handlePlaceSelect = useEffectEvent(onSelect);
  useImperativeHandle(
    ref,
    () => ({
      highlightRoute(highlight) {
        const currentMap = map.current;
        if (!ready || !currentMap) return;
        clearHighlight.current();
        const focusBounds = new kakao.maps.LatLngBounds();
        const highlightColor = getComputedStyle(container.current ?? document.documentElement)
          .getPropertyValue('--route-highlight')
          .trim();
        const lines = highlight.segments
          .filter((segment) => segment.points.length > 1)
          .map((segment) => {
            const path = segment.points.map((point) => new kakao.maps.LatLng(point.lat, point.lng));
            path.forEach((point) => focusBounds.extend(point));
            return new kakao.maps.Polyline({
              map: currentMap,
              path,
              strokeWeight: 9,
              strokeColor: highlightColor,
              strokeOpacity: 0.95,
              strokeStyle: segment.mode === 'walk' ? 'solid' : 'shortdash',
              zIndex: 10,
            });
          });
        const destination = new kakao.maps.LatLng(
          highlight.destination.lat,
          highlight.destination.lng,
        );
        focusBounds.extend(destination);
        const marker = document.createElement('span');
        marker.className = 'route-focus-marker';
        marker.setAttribute('role', 'status');
        marker.setAttribute('aria-label', `${highlight.label} 이동 미리보기`);
        const dot = document.createElement('span');
        dot.className = 'route-playback-dot';
        const label = document.createElement('span');
        label.className = 'route-playback-label';
        label.textContent = '이동 미리보기';
        marker.append(dot, label);
        const overlay = new kakao.maps.CustomOverlay({
          map: currentMap,
          position: destination,
          content: marker,
          xAnchor: 0.5,
          yAnchor: 0.5,
          zIndex: 11,
        });
        currentMap.setBounds(focusBounds, 100, 70, 110, 70);
        const stopPlayback = playRoute(highlight.segments, (position) => {
          overlay.setPosition(new kakao.maps.LatLng(position.lat, position.lng));
        });
        clearHighlight.current = () => {
          stopPlayback();
          lines.forEach((line) => line.setMap(null));
          overlay.setMap(null);
        };
      },
    }),
    [ready],
  );

  useEffect(() => {
    let active = true;
    const key: unknown = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
    if (typeof key !== 'string' || !key) {
      setError('카카오 JavaScript 키를 설정하면 이곳에 지도가 표시돼요.');
      return;
    }
    loadKakaoMap(key)
      .then(() => {
        if (!active || !container.current) return;
        map.current = new kakao.maps.Map(container.current, {
          center: new kakao.maps.LatLng(37.54458, 127.05598),
          level: 5,
        });
        setReady(true);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : '지도를 불러오지 못했어요.');
      });
    return () => {
      active = false;
      clearHighlight.current();
    };
  }, []);

  useEffect(() => {
    const currentMap = map.current;
    const element = container.current;
    if (!ready || !currentMap || !element) return;
    const observer = new ResizeObserver(() => {
      const center = currentMap.getCenter();
      const level = currentMap.getLevel();
      currentMap.relayout();
      currentMap.setLevel(level, { animate: false, anchor: center });
      currentMap.setCenter(center);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ready]);

  useEffect(() => {
    const currentMap = map.current;
    if (!ready || !currentMap) return;
    const overlays: kakao.maps.CustomOverlay[] = [];
    const lines: kakao.maps.Polyline[] = [];
    const viewBounds = new kakao.maps.LatLngBounds();
    const visible = new Map(
      [
        ...places,
        ...selected,
        ...(origin ? [origin] : []),
        ...(destination ? [destination] : []),
      ].map((place) => [place.id, place]),
    );
    let markerIndex = 0;
    for (const place of visible.values()) {
      const isOrigin = origin?.id === place.id;
      const isDestination = destination?.id === place.id;
      const index = selected.findIndex((item) => item.id === place.id);
      const canSelect = !isOrigin && !isDestination && index < 0;
      const marker = document.createElement('div');
      marker.className = 'map-place-marker';
      const pin = document.createElement('button');
      pin.className = `map-pin pin-${place.category} ${isOrigin ? 'pin-origin' : ''} ${index >= 0 ? 'pin-selected' : ''} ${isDestination ? 'pin-destination' : ''}`;
      pin.textContent = isOrigin
        ? isDestination
          ? '왕복'
          : '출발'
        : isDestination
          ? '도착'
          : index >= 0
            ? String(index + 1)
            : categoryPinLabels[place.category];
      pin.setAttribute(
        'aria-label',
        `${place.name}${isOrigin ? (isDestination ? ' 출발점 · 도착점' : ' 출발점') : isDestination ? ' 도착점' : index >= 0 ? ' 선택됨' : ' 선택'}`,
      );
      pin.setAttribute('aria-disabled', String(!canSelect));
      pin.title = place.name;
      const previewId = `map-place-preview-${markerIndex}`;
      markerIndex += 1;
      pin.setAttribute('aria-describedby', previewId);
      if (canSelect) pin.onclick = () => handlePlaceSelect(place);
      marker.append(pin, createMapPlacePreview(place, origin, previewId));
      const position = new kakao.maps.LatLng(place.lat, place.lng);
      viewBounds.extend(position);
      const zIndex = isOrigin || isDestination ? 5 : index >= 0 ? 4 : 3;
      const overlay = new kakao.maps.CustomOverlay({
        map: currentMap,
        position,
        content: marker,
        yAnchor: 1,
        zIndex,
      });
      overlays.push(overlay);
    }
    for (const leg of itinerary?.legs ?? []) {
      for (const segment of leg.segments) {
        const path = segment.points.map((point) => new kakao.maps.LatLng(point.lat, point.lng));
        path.forEach((point) => viewBounds.extend(point));
        lines.push(
          new kakao.maps.Polyline({
            map: currentMap,
            path,
            strokeWeight: 5,
            strokeColor:
              segment.mode === 'walk' ? '#245d46' : segment.mode === 'bus' ? '#b66b3d' : '#4264af',
            strokeOpacity: 0.9,
            strokeStyle: segment.mode === 'walk' ? 'solid' : 'shortdash',
          }),
        );
      }
    }
    if (!viewBounds.isEmpty()) {
      bounds.current = viewBounds;
      currentMap.setBounds(viewBounds, 85, 65, 90, 65);
    }
    return () => {
      clearHighlight.current();
      overlays.forEach((overlay) => overlay.setMap(null));
      lines.forEach((line) => line.setMap(null));
    };
  }, [ready, origin, destination, places, selected, itinerary]);

  return (
    <>
      <div ref={container} className="kakao-canvas" aria-label="카카오 지도" />
      {error ? (
        <div className="map-message" role="alert">
          <strong>지도 연결을 확인해주세요</strong>
          <p>{error}</p>
          <Button onClick={() => window.location.reload()}>다시 불러오기</Button>
        </div>
      ) : !ready ? (
        <div className="map-message" role="status">
          <span className="spinner" /> 지도를 불러오는 중이에요.
        </div>
      ) : null}
      <div className="map-controls">
        <Button
          variant="outline"
          size="icon"
          aria-label="지도 확대"
          onClick={() => {
            const current = map.current;
            if (current) current.setLevel(current.getLevel() - 1);
          }}
        >
          <Plus size={18} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="지도 축소"
          onClick={() => {
            const current = map.current;
            if (current) current.setLevel(current.getLevel() + 1);
          }}
        >
          <Minus size={18} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="전체 동선 보기"
          onClick={() => {
            clearHighlight.current();
            if (bounds.current) map.current?.setBounds(bounds.current, 85, 65, 90, 65);
          }}
        >
          <Crosshair size={18} />
        </Button>
      </div>
    </>
  );
}
