import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { requestJson } from '@/common/http/request-json';
import { placeSchema, type Place } from '../models/model-trip';

import {
  discoveryResultSchema,
  type DiscoveryResult,
  type DiscoveryMode,
} from '../models/model-discovery';
import { koreaDate } from '../utils/korea-date';

import { crowdingResponseSchema } from '../models/model-crowding';

export const tripQueries = {
  crowdings: () => [...tripQueries.all, 'crowding'],
  crowding: (places: Pick<Place, 'id' | 'lat' | 'lng'>[]) =>
    queryOptions({
      queryKey: [...tripQueries.crowdings(), places],
      enabled: places.length > 0,
      staleTime: 60_000,
      refetchInterval: 60_000,
      retry: false,
      queryFn: async ({ signal }) =>
        crowdingResponseSchema.parse(
          await requestJson('/api/crowding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ places }),
            signal,
          }),
        ),
    }),
  discoveries: () => [...tripQueries.all, 'discovery'],
  discovery: (origin: Place | null, mode: DiscoveryMode | 'pet', radius: number, enabled = true) =>
    infiniteQueryOptions({
      queryKey: [...tripQueries.discoveries(), origin?.lat, origin?.lng, mode, radius, koreaDate()],
      enabled: origin !== null && mode !== 'nearby' && enabled,
      initialPageParam: 1,
      staleTime: 60_000,
      retry: false,
      getNextPageParam: (lastPage: DiscoveryResult) => lastPage.nextPage ?? undefined,
      queryFn: async ({ signal, pageParam }): Promise<DiscoveryResult> => {
        if (!origin) return { places: [], recommendations: [], date: koreaDate(), nextPage: null };
        const params = new URLSearchParams({
          mode,
          lat: String(origin.lat),
          lng: String(origin.lng),
          radius: String(radius),
          page: String(pageParam),
        });
        return discoveryResultSchema.parse(
          await requestJson(`/api/discover?${params}`, { signal }),
        );
      },
    }),
  all: ['trip'],
  configs: () => [...tripQueries.all, 'config'],
  config: () =>
    queryOptions({
      queryKey: tripQueries.configs(),
      queryFn: async () =>
        z
          .object({ demo: z.boolean(), configured: z.boolean(), demoOrigin: placeSchema })
          .parse(await requestJson('/api/config')),
      staleTime: Infinity,
    }),
  searches: () => [...tripQueries.all, 'search'],
  search: (query: string) =>
    queryOptions({
      queryKey: [...tripQueries.searches(), query],
      enabled: query.trim().length > 0,
      queryFn: async ({ signal }) =>
        z
          .array(placeSchema)
          .parse(await requestJson(`/api/search?${new URLSearchParams({ q: query })}`, { signal })),
    }),
  nearbyLists: () => [...tripQueries.all, 'nearby'],
  nearbyList: (origin: Place | null, radius: number, enabled = true) =>
    queryOptions({
      queryKey: [...tripQueries.nearbyLists(), origin?.id, origin?.lat, origin?.lng, radius],
      enabled: origin !== null && enabled,
      staleTime: 60_000,
      queryFn: async ({ signal }) => {
        if (!origin) return [];
        const params = new URLSearchParams({
          lat: String(origin.lat),
          lng: String(origin.lng),
          radius: String(radius),
        });
        return z.array(placeSchema).parse(await requestJson(`/api/nearby?${params}`, { signal }));
      },
    }),
};
