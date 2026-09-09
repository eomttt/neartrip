import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import {
  itinerarySchema,
  placeSchema,
  type Category,
  type Place,
  type PlanRequest,
} from '../models/model-trip';

async function requestJson(path: string, options?: RequestInit): Promise<unknown> {
  const response = await fetch(path, options);
  const data: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(data);
    throw new Error(error.success ? error.data.error : '요청을 완료하지 못했습니다.');
  }
  return data;
}

export const searchTripQueries = {
  config: () =>
    queryOptions({
      queryKey: ['trip', 'config'],
      queryFn: async () =>
        z
          .object({ demo: z.boolean(), configured: z.boolean(), demoOrigin: placeSchema })
          .parse(await requestJson('/api/config')),
      staleTime: Infinity,
    }),
  places: (query: string) =>
    queryOptions({
      queryKey: ['trip', 'search', query],
      enabled: query.trim().length > 0,
      queryFn: async ({ signal }) =>
        z
          .array(placeSchema)
          .parse(await requestJson(`/api/search?${new URLSearchParams({ q: query })}`, { signal })),
    }),
  nearby: (origin: Place | null, category: Category | undefined, radius: number) =>
    queryOptions({
      queryKey: ['trip', 'nearby', origin?.id, origin?.lat, origin?.lng, category, radius],
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

export async function requestPlan(body: PlanRequest, signal: AbortSignal) {
  return itinerarySchema.parse(
    await requestJson('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    }),
  );
}
