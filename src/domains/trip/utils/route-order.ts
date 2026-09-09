import type { Coordinate, Place } from '../models/model-trip';

export function distanceMeters(a: Coordinate, b: Coordinate): number {
  const radians = Math.PI / 180;
  const dLat = (b.lat - a.lat) * radians;
  const dLng = (b.lng - a.lng) * radians;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// 최대 5곳의 순열만 비교해 외부 경로 API 호출 없이 방문 순서를 먼저 정합니다.
export function orderRoundTrip(origin: Place, places: Place[]): Place[] {
  let bestDistance = Infinity;
  let bestOrder = places;
  function visit(current: Place, remaining: Place[], ordered: Place[], distance: number) {
    if (remaining.length === 0) {
      const total = distance + distanceMeters(current, origin);
      if (total < bestDistance) {
        bestDistance = total;
        bestOrder = ordered;
      }
      return;
    }
    for (const place of remaining) {
      visit(
        place,
        remaining.filter((item) => item.id !== place.id),
        [...ordered, place],
        distance + distanceMeters(current, place),
      );
    }
  }
  visit(origin, places, [], 0);
  return bestOrder;
}

export function formatDistance(meters: number): string {
  return meters < 1_000 ? `${Math.round(meters)}m` : `${(meters / 1_000).toFixed(1)}km`;
}

export function formatMinutes(seconds: number): string {
  return `${Math.max(1, Math.ceil(seconds / 60))}분`;
}
