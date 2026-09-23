import type { Place } from '../models/model-trip';
import { distanceMeters } from './route-order';

export function mergePetPlaces(nearby: Place[], pets: Place[]): Place[] {
  const places = [...nearby];
  for (const pet of pets) {
    if (pet.tourism?.kind !== 'pet') continue;
    // 이름과 위치가 모두 일치할 때만 주변 장소에 동반 정보를 연결합니다.
    const matches = places.filter(
      (place) =>
        place.id === pet.id ||
        (place.name.replace(/\s/g, '') === pet.name.replace(/\s/g, '') &&
          distanceMeters(place, pet) <= 30),
    );
    const match = matches.length === 1 ? matches[0] : undefined;
    if (match) {
      places[places.indexOf(match)] = { ...match, tourism: pet.tourism };
    } else if (matches.length === 0) {
      places.push(pet);
    }
  }
  return places;
}
