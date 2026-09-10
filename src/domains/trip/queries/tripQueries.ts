import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { requestJson } from '@/common/http/request-json';
import { placeSchema, type Category, type Place } from '../models/model-trip';

export const tripQueries = {
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
  nearbyList: (origin: Place | null, category: Category | undefined, radius: number) =>
    queryOptions({
      queryKey: [
        ...tripQueries.nearbyLists(),
        origin?.id,
        origin?.lat,
        origin?.lng,
        category,
        radius,
      ],
      enabled: origin !== null,
      staleTime: 60_000,
      queryFn: async ({ signal }) => {
        if (!origin) return [];
        const params = new URLSearchParams({
          lat: String(origin.lat),
          lng: String(origin.lng),
          radius: String(radius),
        });
        if (category) params.set('category', category);
        return z.array(placeSchema).parse(await requestJson(`/api/nearby?${params}`, { signal }));
      },
    }),
};
