import type { Leg } from '../models/model-trip';

export function getNaverRouteUrl(leg: Leg) {
  const pathType =
    leg.travelMode === 'driving' || leg.segments.some((segment) => segment.mode === 'car')
      ? '0'
      : leg.segments.length > 0 && leg.segments.every((segment) => segment.mode === 'walk')
        ? '3'
        : '1';
  const params = new URLSearchParams({
    menu: 'route',
    slng: String(leg.from.lng),
    slat: String(leg.from.lat),
    stext: leg.from.name,
    elng: String(leg.to.lng),
    elat: String(leg.to.lat),
    etext: leg.to.name,
    pathType,
  });

  return `https://map.naver.com/index.nhn?${params}`;
}
