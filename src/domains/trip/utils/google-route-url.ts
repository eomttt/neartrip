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

  if (leg.from.id.startsWith('google:')) searchParams.set('origin_place_id', leg.from.id.slice(7));
  if (leg.to.id.startsWith('google:')) searchParams.set('destination_place_id', leg.to.id.slice(7));

  if (leg.travelMode === 'driving' || leg.segments.some((segment) => segment.mode === 'car')) {
    searchParams.set('travelmode', 'driving');
  } else if (leg.segments.length > 0) {
    const travelMode = leg.segments.some((segment) => segment.mode !== 'walk')
      ? 'transit'
      : 'walking';
    searchParams.set('travelmode', travelMode);
  } else if (leg.travelMode === 'local') {
    searchParams.set('travelmode', 'transit');
  }

  return `https://www.google.com/maps/dir/?${searchParams.toString()}`;
}
