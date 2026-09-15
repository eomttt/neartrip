import { RoutePlaybackMarker } from '../RoutePlaybackMarker';
import type { RouteHighlight, RouteMapHandle } from '../../utils/route-highlight';
import { Button } from '@/common/design-system/components/Button';
import { useImperativeHandle, useState, type Ref } from 'react';
import { Crosshair, Minus, Plus } from 'lucide-react';
import type { Category, Itinerary, Place } from '../../models/model-trip';
import { distanceMeters, formatDistance } from '../../utils/route-order';
import { useI18n } from '@/common/i18n/components/I18nProvider';
import { categoryMessageKeys } from '../../i18n/trip-message-keys';

const categoryPinColors: Record<Category, string> = {
  restaurant: '#bc725b',
  cafe: '#b5824f',
  attraction: '#668c73',
  bar: '#87647f',
};
const categoryPinLabels: Record<Category, string> = {
  restaurant: 'F',
  cafe: 'C',
  attraction: 'P',
  bar: 'B',
};

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
function point(place: { lat: number; lng: number }) {
  return { x: 100 + (place.lng - 127.044) * 42_000, y: 640 - (place.lat - 37.539) * 55_000 };
}

export function DemoMap({
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
  const [zoom, setZoom] = useState(1);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{
    target: RouteHighlight;
    itinerary: Itinerary | null;
    request: number;
  } | null>(null);
  const highlight = focus?.itinerary === itinerary ? focus : null;
  useImperativeHandle(
    ref,
    () => ({
      highlightRoute(target) {
        setZoom(1);
        setFocus((current) => ({ target, itinerary, request: (current?.request ?? 0) + 1 }));
      },
    }),
    [itinerary],
  );
  const focusedPoints = highlight
    ? [
        ...highlight.target.segments.flatMap((segment) => segment.points),
        highlight.target.destination,
      ].map(point)
    : [{ x: 450, y: 380 }];
  const minX = Math.min(...focusedPoints.map((value) => value.x));
  const minY = Math.min(...focusedPoints.map((value) => value.y));
  const maxX = Math.max(...focusedPoints.map((value) => value.x));
  const maxY = Math.max(...focusedPoints.map((value) => value.y));
  const width = Math.max(240, maxX - minX + 160);
  const height = Math.max(200, maxY - minY + 160);
  const view = highlight
    ? { x: (minX + maxX - width) / 2, y: (minY + maxY - height) / 2, width, height }
    : { x: 0, y: 0, width: 900, height: 760 };
  const center = { x: view.x + view.width / 2, y: view.y + view.height / 2 };
  const visible = new Map(
    [
      ...places,
      ...selected,
      ...(origin ? [origin] : []),
      ...(destination ? [destination] : []),
    ].map((place) => [place.id, place]),
  );
  return (
    <>
      <svg
        className="demo-canvas"
        viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
        role="group"
        aria-label={t('map.demoLabel')}
      >
        <defs>
          <pattern
            id="blocks"
            width="116"
            height="99"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-12)"
          >
            <rect width="116" height="99" fill="#eceee7" />
            <rect x="8" y="8" width="98" height="81" rx="8" fill="#e0e3da" />
            <path d="M30 8V89M8 57H106M66 8V57" stroke="#eceee7" strokeWidth="4" />
          </pattern>
          <pattern id="trees" width="36" height="36" patternUnits="userSpaceOnUse">
            <circle cx="18" cy="18" r="6" fill="#c1d3b9" />
          </pattern>
          <filter id="pin-shadow">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity=".13" />
          </filter>
        </defs>
        <rect width="900" height="760" fill="#e9ece3" />
        <g
          transform={`translate(${center.x * (1 - zoom)} ${center.y * (1 - zoom)}) scale(${zoom})`}
        >
          <rect x="-300" y="-300" width="1500" height="1400" fill="url(#blocks)" />
          <path d="M-50 640Q230 565 430 670T960 625L960 850H-50Z" fill="#bfd8d7" />
          <path
            d="M-50 616Q230 541 430 646T960 601"
            stroke="#dce8d4"
            strokeWidth="35"
            fill="none"
          />
          <path d="M-10 180L145 136L299 350L245 560L80 550L-20 400Z" fill="#cfdcc3" />
          <path d="M-10 180L145 136L299 350L245 560L80 550L-20 400Z" fill="url(#trees)" />
          <path d="M12 289Q185 255 210 401T82 528" stroke="#e8eddd" fill="none" strokeWidth="9" />
          <path
            d="M-100 405L990 192M372-60L518 790M-20 105L934 507"
            fill="none"
            stroke="#d4d9cf"
            strokeWidth="25"
          />
          <path
            d="M-100 405L990 192M372-60L518 790M-20 105L934 507"
            fill="none"
            stroke="#fffefa"
            strokeWidth="19"
          />
          <path
            d="M-100 405L990 192"
            fill="none"
            stroke="#aab99e"
            strokeWidth="3"
            strokeDasharray="7 6"
          />
          <g fill="#919e8d" fontSize="13" fontFamily="sans-serif">
            <text x="106" y="365" fill="#6d8c62" fontSize="19" fontWeight="600">
              초록 공원
            </text>
            <text x="589" y="211" transform="rotate(-11 589 211)">
              예시 큰길
            </text>
            <text x="577" y="531" fontSize="22" letterSpacing="8" fill="#a0aa9c">
              성 수 동
            </text>
            <text x="657" y="681" fill="#739d9c" letterSpacing="8">
              한 강
            </text>
            <text x="178" y="132">
              골목 산책
            </text>
          </g>
          {itinerary?.legs.map((leg) => (
            <polyline
              key={`${leg.from.id}-${leg.to.id}`}
              points={[leg.from, leg.to]
                .map((value) => {
                  const p = point(value);
                  return `${p.x},${p.y}`;
                })
                .join(' ')}
              stroke="#245d46"
              strokeWidth="4"
              strokeDasharray="8 7"
              strokeLinecap="round"
              fill="none"
            />
          ))}
          {highlight ? (
            <g
              key={highlight.request}
              className="demo-route-highlight"
              role="status"
              aria-label={t('map.previewMoving', { label: highlight.target.label })}
            >
              {highlight.target.segments.map((segment, index) => (
                <polyline
                  key={index}
                  points={segment.points
                    .map((value) => {
                      const p = point(value);
                      return `${p.x},${p.y}`;
                    })
                    .join(' ')}
                  stroke="var(--route-highlight)"
                  strokeWidth="9"
                  strokeDasharray="8 7"
                  fill="none"
                  strokeLinecap="round"
                />
              ))}
              <RoutePlaybackMarker
                segments={highlight.target.segments}
                destination={highlight.target.destination}
                project={point}
              />
            </g>
          ) : null}
          {Array.from(visible.values()).map((place) => {
            const p = point(place);
            const isOrigin = place.id === origin?.id;
            const isDestination = place.id === destination?.id;
            const index = selected.findIndex((item) => item.id === place.id);
            const canToggle = !isOrigin && !isDestination;
            const color =
              isOrigin || isDestination || index >= 0
                ? '#245d46'
                : categoryPinColors[place.category];
            return (
              <g
                key={place.id}
                className="demo-place-marker"
                transform={`translate(${p.x} ${p.y})`}
                onMouseEnter={() => setHoveredPlaceId(place.id)}
                onMouseLeave={() => setHoveredPlaceId(null)}
                onFocus={() => setHoveredPlaceId(place.id)}
                onBlur={() => setHoveredPlaceId(null)}
              >
                {hoveredPlaceId === place.id ? (
                  <g
                    className="demo-place-preview"
                    transform={`translate(0 ${p.y < 190 ? 50 : -142})`}
                    role="tooltip"
                    aria-label={t('map.preview', { name: place.name })}
                  >
                    <rect x="-124" width="248" height="112" rx="12" />
                    <text x="-108" y="24" className="demo-place-preview-category">
                      {t(categoryMessageKeys[place.category])}
                    </text>
                    <text x="-108" y="47" className="demo-place-preview-name">
                      {place.name}
                    </text>
                    <text x="-108" y="70" className="demo-place-preview-address">
                      {place.address}
                    </text>
                    <text x="-108" y="94" className="demo-place-preview-meta">
                      {origin
                        ? t('place.straightDistance', {
                            distance: formatDistance(distanceMeters(origin, place)),
                          })
                        : t('map.distanceLoading')}
                    </text>
                  </g>
                ) : null}
                <g
                  role="button"
                  tabIndex={canToggle ? 0 : -1}
                  aria-disabled={!canToggle}
                  aria-pressed={canToggle ? index >= 0 : undefined}
                  aria-label={
                    isOrigin
                      ? t(isDestination ? 'map.originDestination' : 'map.origin', {
                          name: place.name,
                        })
                      : isDestination
                        ? t('map.destination', { name: place.name })
                        : t(index >= 0 ? 'map.remove' : 'map.select', { name: place.name })
                  }
                  onClick={() => {
                    if (canToggle) onSelect(place);
                  }}
                  onKeyDown={(event) => {
                    if (canToggle && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      onSelect(place);
                    }
                  }}
                  className="svg-pin"
                  filter="url(#pin-shadow)"
                >
                  <circle r={isOrigin ? 27 : 21} fill={color} stroke="#fffefa" strokeWidth="4" />
                  <text
                    textAnchor="middle"
                    y="5"
                    fill="white"
                    fontSize={isOrigin || isDestination ? 12 : 14}
                    fontWeight="700"
                  >
                    {isOrigin
                      ? isDestination
                        ? t('map.roundTrip')
                        : t('map.start')
                      : isDestination
                        ? t('map.end')
                        : index >= 0
                          ? index + 1
                          : categoryPinLabels[place.category]}
                  </text>
                </g>
                <text
                  y="43"
                  textAnchor="middle"
                  fill="#39463a"
                  fontSize="12"
                  fontWeight="600"
                  stroke="#f4f5ef"
                  strokeWidth="5"
                  paintOrder="stroke"
                >
                  {place.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="map-controls">
        <Button
          variant="outline"
          size="icon"
          aria-label={t('map.demoZoomIn')}
          disabled={zoom >= 1.5}
          onClick={() => setZoom((current) => Math.min(1.5, current + 0.25))}
        >
          <Plus size={18} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label={t('map.demoZoomOut')}
          disabled={zoom <= 0.75}
          onClick={() => setZoom((current) => Math.max(0.75, current - 0.25))}
        >
          <Minus size={18} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="map-overview-action h-9 w-auto px-3 text-xs"
          aria-label={itinerary ? t('map.fullRoute') : t('map.fullDemo')}
          onClick={() => {
            setZoom(1);
            setFocus(null);
            onShowEntireRoute();
          }}
        >
          <Crosshair size={18} />
          <span>{itinerary ? t('map.fullRouteText') : t('map.fullText')}</span>
        </Button>
      </div>
      <span className="demo-watermark">{t('map.demoWatermark')}</span>
    </>
  );
}
