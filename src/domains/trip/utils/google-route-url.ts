import type { Leg, Place } from '../models/model-trip';

function routeCoordinate(place: Place) {
  return `${place.lat},${place.lng}`;
}

export function getGoogleRouteUrl(leg: Leg) {
  const searchParams = new URLSearchParams({
    api: '1',
    origin: routeCoordinate(leg.from),
    destination: routeCoordinate(leg.to),
  });

  if (leg.travelMode === 'driving' || leg.segments.some((segment) => segment.mode === 'car')) {
    searchParams.set('travelmode', 'driving');
  } else if (leg.segments.length > 0) {
    const travelMode = leg.segments.some((segment) => segment.mode !== 'walk')
      ? 'transit'
      : 'walking';
    searchParams.set('travelmode', travelMode);
  }

  return `https://www.google.com/maps/dir/?${searchParams.toString()}`;
}
