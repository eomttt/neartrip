import type { Leg, Place } from '../models/model-trip';

function routePoint(place: Place) {
  return `${encodeURIComponent(place.name)},${place.lat},${place.lng}`;
}

export function getKakaoRouteUrl(leg: Leg) {
  const from = routePoint(leg.from);
  const to = routePoint(leg.to);
  if (leg.segments.length === 0) return `https://map.kakao.com/link/from/${from}/to/${to}`;
  const mode = leg.segments.some((segment) => segment.mode !== 'walk') ? 'traffic' : 'walk';
  return `https://map.kakao.com/link/by/${mode}/${from}/${to}`;
}
