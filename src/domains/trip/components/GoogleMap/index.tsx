import { playRoute } from '../../utils/route-playback';
import type { RouteMapHandle } from '../../utils/route-highlight';
import { Button } from '@/common/design-system/components/Button';
import { useEffect, useEffectEvent, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Crosshair, Minus, Plus } from 'lucide-react';
import { loadGoogleMap } from '../../../../common/maps/google-loader';
import type { Category, Itinerary, Place } from '../../models/model-trip';
import { getAttributionUrl, getPlaceDetailUrl } from '../../utils/place-detail';
import { distanceMeters, formatDistance } from '../../utils/route-order';
import { useI18n } from '@/common/i18n/components/I18nProvider';
import type { MessageKey, MessageValues } from '@/common/i18n/messages';
import { categoryMessageKeys } from '../../i18n/trip-message-keys';

const categoryPinLabels: Record<Category, string> = {
  restaurant: 'F',
  cafe: 'C',
  attraction: 'P',
  bar: 'B',
};

function transitLineStyle(mode: string): google.maps.PolylineOptions {
  return mode === 'walk' || mode === 'car'
    ? {}
    : {
        strokeOpacity: 0,
        icons: [
          {
            icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.9, scale: 2 },
            offset: '0',
            repeat: '12px',
          },
        ],
      };
}

function createHtmlOverlay({
  map,
  position,
  content,
  xAnchor = 0.5,
  yAnchor = 1,
  zIndex,
}: {
  map: google.maps.Map;
  position: google.maps.LatLng;
  content: HTMLElement;
  xAnchor?: number;
  yAnchor?: number;
  zIndex: number;
}) {
  class HtmlOverlay extends google.maps.OverlayView {
    private position = position;
    private element = document.createElement('div');
    constructor() {
      super();
      this.element.style.position = 'absolute';
      this.element.style.zIndex = String(zIndex);
      this.element.style.transform = `translate(${-xAnchor * 100}%, ${-yAnchor * 100}%)`;
      this.element.append(content);
      google.maps.OverlayView.preventMapHitsAndGesturesFrom(this.element);
      this.setMap(map);
    }
    onAdd() {
      this.getPanes()?.overlayMouseTarget.append(this.element);
    }
    draw() {
      const point = this.getProjection()?.fromLatLngToDivPixel(this.position);
      if (!point) return;
      this.element.style.left = `${point.x}px`;
      this.element.style.top = `${point.y}px`;
    }
    onRemove() {
      this.element.remove();
    }
    setPosition(next: google.maps.LatLng) {
      this.position = next;
      this.draw();
    }
  }
  return new HtmlOverlay();
}

function fitMapBounds(
  currentMap: google.maps.Map,
  targetBounds: google.maps.LatLngBounds,
  element: HTMLElement | null,
) {
  if (targetBounds.getNorthEast().equals(targetBounds.getSouthWest())) {
    currentMap.setCenter(targetBounds.getCenter());
    currentMap.setZoom(15);
    return;
  }
  const verticalInset = Math.min(65, Math.max(24, Math.round((element?.clientHeight ?? 650) / 10)));
  const horizontalInset = Math.min(
    85,
    Math.max(24, Math.round((element?.clientWidth ?? 650) / 10)),
  );
  currentMap.fitBounds(targetBounds, {
    top: verticalInset,
    right: horizontalInset,
    bottom: verticalInset,
    left: horizontalInset,
  });
}

function createMapPlacePreview(
  place: Place,
  origin: Place | null,
  id: string,
  t: (key: MessageKey, values?: MessageValues) => string,
): HTMLElement {
  const preview = document.createElement('article');
  preview.id = id;
  preview.className = 'map-place-preview';
  preview.setAttribute('role', 'tooltip');
  preview.setAttribute('aria-label', t('map.preview', { name: place.name }));

  const category = document.createElement('span');
  category.className = 'map-place-preview-category';
  category.textContent = t(categoryMessageKeys[place.category]);
  const name = document.createElement('strong');
  name.textContent = place.name;
  const address = document.createElement('p');
  address.className = 'map-place-preview-address';
  address.textContent = place.address;
  const meta = document.createElement('div');
  meta.className = 'map-place-preview-meta';
  if (origin) {
    const distance = document.createElement('span');
    distance.textContent = t('place.straightDistance', {
      distance: formatDistance(distanceMeters(origin, place)),
    });
    meta.append(distance);
  }
  const detailUrl = getPlaceDetailUrl(place.url);
  if (detailUrl) {
    const detail = document.createElement('a');
    detail.href = detailUrl;
    detail.target = '_blank';
    detail.rel = 'noopener noreferrer';
    detail.textContent = `${t('place.detail')} ↗`;
    detail.setAttribute('aria-label', t('place.detailLabel', { name: place.name }));
    meta.append(detail);
  }
  preview.append(category, name, address, meta);
  if (place.attributions?.length) {
    const attribution = document.createElement('p');
    attribution.className = 'map-place-preview-address';
    place.attributions.forEach((provider, index) => {
      if (index > 0) attribution.append(' · ');
      const url = getAttributionUrl(provider.url);
      if (!url) {
        attribution.append(provider.name);
        return;
      }
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = provider.name;
      attribution.append(link);
    });
    preview.append(attribution);
  }
  return preview;
}

interface Props {
  ref?: Ref<RouteMapHandle>;
  origin: Place | null;
  destination?: Place | null;
  places: Place[];
  selected: Place[];
  itinerary: Itinerary | null;
  onShowEntireRoute: () => void;
  onSelect: (place: Place) => void;
}

export function GoogleMap({
  ref,
  origin,
  destination,
  places,
  selected,
  itinerary,
  onShowEntireRoute,
  onSelect,
}: Props) {
  const { locale, t } = useI18n();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const bounds = useRef<google.maps.LatLngBounds | null>(null);
  const lastFramed = useRef<{
    origin: Place | null;
    destination: Place | null;
    itinerary: Itinerary | null;
  } | null>(null);
  const activeBounds = useRef<google.maps.LatLngBounds | null>(null);
  const clearHighlight = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const handlePlaceSelect = useEffectEvent(onSelect);
  const handleMapFailure = useEffectEvent(() => setError(t('map.loadFailed')));
  useImperativeHandle(
    ref,
    () => ({
      highlightRoute(highlight) {
        const currentMap = map.current;
        if (!ready || !currentMap) return;
        clearHighlight.current();
        activeBounds.current = null;
        const focusBounds = new google.maps.LatLngBounds();
        const highlightColor = getComputedStyle(container.current ?? document.documentElement)
          .getPropertyValue('--route-highlight')
          .trim();
        const lines = highlight.segments
          .filter((segment) => segment.points.length > 1)
          .map((segment) => {
            const path = segment.points.map(
              (point) => new google.maps.LatLng(point.lat, point.lng),
            );
            path.forEach((point) => focusBounds.extend(point));
            return new google.maps.Polyline({
              map: currentMap,
              path,
              strokeWeight: 9,
              strokeColor: highlightColor,
              strokeOpacity: 0.95,
              ...transitLineStyle(segment.mode),
              zIndex: 10,
            });
          });
        const destination = new google.maps.LatLng(
          highlight.destination.lat,
          highlight.destination.lng,
        );
        focusBounds.extend(destination);
        const marker = document.createElement('span');
        marker.className = 'route-focus-marker';
        marker.setAttribute('role', 'status');
        marker.setAttribute(
          'aria-label',
          t(highlight.segments.length ? 'map.previewMoving' : 'map.destinationFocus', {
            label: highlight.label,
          }),
        );
        const dot = document.createElement('span');
        dot.className = 'route-playback-dot';
        const label = document.createElement('span');
        label.className = 'route-playback-label';
        label.textContent = t(highlight.segments.length ? 'map.moving' : 'map.destinationMarker');
        marker.append(dot, label);
        const overlay = createHtmlOverlay({
          map: currentMap,
          position: destination,
          content: marker,
          xAnchor: 0.5,
          yAnchor: 0.5,
          zIndex: 11,
        });
        activeBounds.current = focusBounds;
        fitMapBounds(currentMap, focusBounds, container.current);
        const stopPlayback = playRoute(highlight.segments, (position) => {
          overlay.setPosition(new google.maps.LatLng(position.lat, position.lng));
        });
        clearHighlight.current = () => {
          stopPlayback();
          lines.forEach((line) => line.setMap(null));
          overlay.setMap(null);
        };
      },
    }),
    [ready, t],
  );

  useEffect(() => {
    let active = true;
    const handleFailure = () => {
      if (active) handleMapFailure();
    };
    window.addEventListener('neartrip-google-map-error', handleFailure);
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (typeof key !== 'string' || !key) {
      setError(t('map.keyMissing'));
      return () => window.removeEventListener('neartrip-google-map-error', handleFailure);
    }
    loadGoogleMap(key, locale)
      .then(() => {
        if (!active || !container.current) return;
        map.current = new google.maps.Map(container.current, {
          center: new google.maps.LatLng(37.54458, 127.05598),
          zoom: 15,
          maxZoom: 19,
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: 'cooperative',
          keyboardShortcuts: true,
        });
        setReady(true);
      })
      .catch(() => {
        if (active) setError(t('map.loadFailed'));
      });
    return () => {
      active = false;
      window.removeEventListener('neartrip-google-map-error', handleFailure);
      clearHighlight.current();
      if (map.current) google.maps.event.clearInstanceListeners(map.current);
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const currentMap = map.current;
    const element = container.current;
    if (!ready || !currentMap || !element) return;
    const observer = new ResizeObserver(() => {
      const center = currentMap.getCenter();
      const level = currentMap.getZoom();
      google.maps.event.trigger(currentMap, 'resize');
      const routeBounds = activeBounds.current ?? bounds.current;
      if (itinerary && routeBounds) {
        fitMapBounds(currentMap, routeBounds, element);
        return;
      }
      if (level !== undefined) currentMap.setZoom(level);
      if (center) currentMap.setCenter(center);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ready, itinerary]);

  useEffect(() => {
    const currentMap = map.current;
    if (!ready || !currentMap) return;
    const overlays: ReturnType<typeof createHtmlOverlay>[] = [];
    const lines: google.maps.Polyline[] = [];
    const viewBounds = new google.maps.LatLngBounds();
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
      const canToggle = !isOrigin && !isDestination;
      const marker = document.createElement('div');
      marker.className = 'map-place-marker';
      const pin = document.createElement('button');
      pin.className = `map-pin pin-${place.category} ${isOrigin ? 'pin-origin' : ''} ${index >= 0 ? 'pin-selected' : ''} ${isDestination ? 'pin-destination' : ''}`;
      pin.textContent = isOrigin
        ? isDestination
          ? t('map.roundTrip')
          : t('map.start')
        : isDestination
          ? t('map.end')
          : index >= 0
            ? String(index + 1)
            : categoryPinLabels[place.category];
      pin.setAttribute(
        'aria-label',
        isOrigin
          ? t(isDestination ? 'map.originDestination' : 'map.origin', { name: place.name })
          : isDestination
            ? t('map.destination', { name: place.name })
            : t(index >= 0 ? 'map.remove' : 'map.select', { name: place.name }),
      );
      pin.setAttribute('aria-disabled', String(!canToggle));
      if (canToggle) pin.setAttribute('aria-pressed', String(index >= 0));
      pin.title = place.name;
      const previewId = `map-place-preview-${markerIndex}`;
      markerIndex += 1;
      pin.setAttribute('aria-describedby', previewId);
      if (canToggle) pin.onclick = () => handlePlaceSelect(place);
      marker.append(pin, createMapPlacePreview(place, origin, previewId, t));
      const position = new google.maps.LatLng(place.lat, place.lng);
      if (!itinerary || isOrigin || isDestination || index >= 0) viewBounds.extend(position);
      const zIndex = isOrigin || isDestination ? 5 : index >= 0 ? 4 : 3;
      const overlay = createHtmlOverlay({
        map: currentMap,
        position,
        content: marker,
        yAnchor: 1,
        zIndex,
      });
      overlays.push(overlay);
    }
    const palette = getComputedStyle(document.documentElement);
    for (const leg of itinerary?.legs ?? []) {
      for (const segment of leg.segments) {
        const path = segment.points.map((point) => new google.maps.LatLng(point.lat, point.lng));
        path.forEach((point) => viewBounds.extend(point));
        lines.push(
          new google.maps.Polyline({
            map: currentMap,
            path,
            strokeWeight: 5,
            strokeColor:
              segment.mode === 'walk' || segment.mode === 'car'
                ? palette.getPropertyValue('--route-walk').trim()
                : segment.mode === 'bus'
                  ? palette.getPropertyValue('--route-bus').trim()
                  : palette.getPropertyValue('--route-rail').trim(),
            strokeOpacity: 0.9,
            ...transitLineStyle(segment.mode),
          }),
        );
      }
    }
    if (!viewBounds.isEmpty()) {
      bounds.current = viewBounds;
      const previousFrame = lastFramed.current;
      if (
        !previousFrame ||
        previousFrame.origin !== origin ||
        previousFrame.destination !== (destination ?? null) ||
        (itinerary !== null && previousFrame.itinerary !== itinerary)
      ) {
        fitMapBounds(currentMap, viewBounds, container.current);
      }
      lastFramed.current = { origin, destination: destination ?? null, itinerary };
    }
    return () => {
      clearHighlight.current();
      activeBounds.current = null;
      overlays.forEach((overlay) => overlay.setMap(null));
      lines.forEach((line) => line.setMap(null));
    };
  }, [ready, origin, destination, places, selected, itinerary, t]);

  return (
    <>
      <div ref={container} className="google-canvas" aria-label={t('map.googleLabel')} />
      {error ? (
        <div className="map-message" role="alert">
          <strong>{t('map.checkConnection')}</strong>
          <p>{error}</p>
          <Button onClick={() => window.location.reload()}>{t('map.reload')}</Button>
        </div>
      ) : !ready ? (
        <div className="map-message" role="status">
          <span className="spinner" /> {t('map.loading')}
        </div>
      ) : null}
      <div className="map-controls">
        <Button
          variant="outline"
          size="icon"
          aria-label={t('map.zoomIn')}
          onClick={() => {
            const current = map.current;
            if (current) current.setZoom((current.getZoom() ?? 15) + 1);
          }}
        >
          <Plus size={18} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label={t('map.zoomOut')}
          onClick={() => {
            const current = map.current;
            if (current) current.setZoom((current.getZoom() ?? 15) - 1);
          }}
        >
          <Minus size={18} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="map-overview-action h-9 w-auto px-3 text-xs"
          aria-label={t('map.fullRoute')}
          onClick={() => {
            clearHighlight.current();
            activeBounds.current = null;
            if (bounds.current && map.current)
              fitMapBounds(map.current, bounds.current, container.current);
            onShowEntireRoute();
          }}
        >
          <Crosshair size={18} />
          <span>{itinerary ? t('map.fullRouteText') : t('map.fullText')}</span>
        </Button>
      </div>
    </>
  );
}
