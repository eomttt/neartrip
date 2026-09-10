import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tripQueries } from '../queries/tripQueries';
import type { Category, Place } from '../models/model-trip';
import { distanceMeters } from '../utils/route-order';

export function useNearbyPlaces(origin: Place | null, destination: Place | null) {
  const [category, setCategory] = useState<Category>();
  const [radius, setRadius] = useState(1_000);
  const nearby = useQuery(tripQueries.nearbyList(origin, category, radius));
  const places = useMemo(
    () =>
      (nearby.data ?? [])
        .filter((place) => place.id !== origin?.id && place.id !== destination?.id)
        .toSorted((a, b) => (origin ? distanceMeters(origin, a) - distanceMeters(origin, b) : 0)),
    [nearby.data, origin, destination],
  );
  return {
    places,
    category,
    radius,
    onCategoryChange: setCategory,
    onRadiusChange: setRadius,
    isFetching: nearby.isFetching,
    error: nearby.error,
    onRetry: () => nearby.refetch(),
  };
}
