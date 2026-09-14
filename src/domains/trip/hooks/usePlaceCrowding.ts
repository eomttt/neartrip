import { useCallback, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import type { Place } from '../models/model-trip';
import type { CrowdingByPlace } from '../models/model-crowding';
import { tripQueries } from '../queries/tripQueries';

export function usePlaceCrowding(places: Place[]): CrowdingByPlace {
  const batches = useMemo(() => {
    const points = places
      .map(({ id, lat, lng }) => ({ id, lat, lng }))
      .toSorted((a, b) => a.id.localeCompare(b.id));
    const nextBatches: Pick<Place, 'id' | 'lat' | 'lng'>[][] = [];
    for (let i = 0; i < points.length; i += 100) nextBatches.push(points.slice(i, i + 100));
    return nextBatches;
  }, [places]);
  const combine = useCallback(
    (queries: { isError: boolean; data?: CrowdingByPlace }[]): CrowdingByPlace => {
      const results = queries.map((query, index): CrowdingByPlace => {
        if (!query.isError) return query.data ?? {};
        return Object.fromEntries(
          (batches[index] ?? []).map(({ id }) => [
            id,
            {
              state: 'unavailable',
              areaName: null,
              level: null,
              observedAt: null,
              demo: false,
              replacement: false,
            },
          ]),
        );
      });
      return Object.fromEntries(results.flatMap((result) => Object.entries(result)));
    },
    [batches],
  );
  return useQueries({
    queries: batches.map((batch) => tripQueries.crowding(batch)),
    combine,
  });
}
