import { Button } from '@/common/design-system/components/Button';
import { useState } from 'react';
import { Crosshair, Minus, Plus } from 'lucide-react';
import type { Itinerary, Place } from '../../models/model-trip';

interface Props {
  origin: Place | null;
  places: Place[];
  selected: Place[];
  itinerary: Itinerary | null;
  onSelect: (place: Place) => void;
}
function point(place: { lat: number; lng: number }) {
  return { x: 100 + (place.lng - 127.044) * 42_000, y: 640 - (place.lat - 37.539) * 55_000 };
}

export function DemoMap({ origin, places, selected, itinerary, onSelect }: Props) {
  const [zoom, setZoom] = useState(1);
  const visible = new Map(
    [...places, ...selected, ...(origin ? [origin] : [])].map((place) => [place.id, place]),
  );
  return (
    <>
      <svg
        className="demo-canvas"
        viewBox="0 0 900 760"
        role="group"
        aria-label="성수동 예시 개략도. 실제 지도와 도로가 아닙니다."
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
        <g transform={`translate(${450 * (1 - zoom)} ${380 * (1 - zoom)}) scale(${zoom})`}>
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
          {Array.from(visible.values()).map((place) => {
            const p = point(place);
            const isOrigin = place.id === origin?.id;
            const index = selected.findIndex((item) => item.id === place.id);
            const color =
              isOrigin || index >= 0
                ? '#245d46'
                : place.category === 'cafe'
                  ? '#b5824f'
                  : place.category === 'restaurant'
                    ? '#bc725b'
                    : '#668c73';
            return (
              <g key={place.id} transform={`translate(${p.x} ${p.y})`}>
                <g
                  role="button"
                  tabIndex={isOrigin ? -1 : 0}
                  aria-label={`${place.name}${isOrigin ? ' 출발점' : ' 지도에서 선택'}`}
                  onClick={() => {
                    if (!isOrigin) onSelect(place);
                  }}
                  onKeyDown={(event) => {
                    if (!isOrigin && (event.key === 'Enter' || event.key === ' ')) {
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
                    fontSize={isOrigin ? 12 : 14}
                    fontWeight="700"
                  >
                    {isOrigin
                      ? '출발'
                      : index >= 0
                        ? index + 1
                        : place.category === 'cafe'
                          ? 'C'
                          : place.category === 'restaurant'
                            ? 'F'
                            : 'P'}
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
          aria-label="예시 지도 확대"
          disabled={zoom >= 1.5}
          onClick={() => setZoom((current) => Math.min(1.5, current + 0.25))}
        >
          <Plus size={18} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="예시 지도 축소"
          disabled={zoom <= 0.75}
          onClick={() => setZoom((current) => Math.max(0.75, current - 0.25))}
        >
          <Minus size={18} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="예시 지도 전체 보기"
          onClick={() => setZoom(1)}
        >
          <Crosshair size={18} />
        </Button>
      </div>
      <span className="demo-watermark">예시 개략도 · 실제 지도와 경로가 아닙니다</span>
    </>
  );
}
