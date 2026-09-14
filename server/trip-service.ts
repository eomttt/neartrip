import 'server-only';
import { z } from 'zod';
import { categorySchema, planRequestSchema } from '../src/domains/trip/models/model-trip';
import { orderRoundTrip } from '../src/domains/trip/utils/route-order';
import { createDemoLeg, demoOrigin, demoPlaces, nearbyDemo } from './demo';
import { getLeg, nearbyPlaces, searchPlaces } from './kakao';
import { withTraceLeg } from './request-trace';

export function getTripConfig() {
  const javascriptKey =
    process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY || process.env.VITE_KAKAO_JAVASCRIPT_KEY;
  return {
    demo: process.env.DEMO_MODE === 'true' || (!process.env.KAKAO_REST_API_KEY && !javascriptKey),
    configured: Boolean(process.env.KAKAO_REST_API_KEY && javascriptKey),
    demoOrigin,
  };
}

export async function searchTripPlaces(params: URLSearchParams) {
  const query = z.string().trim().min(1).max(80).parse(params.get('q'));
  return getTripConfig().demo
    ? [demoOrigin, ...demoPlaces].filter((place) =>
        `${place.name} ${place.address}`.includes(query),
      )
    : searchPlaces(query);
}

export async function findNearbyPlaces(params: URLSearchParams) {
  const { lat, lng, category, radius } = z
    .object({
      lat: z.coerce.number().min(32).max(39.5),
      lng: z.coerce.number().min(124).max(132),
      category: categorySchema.optional(),
      radius: z.coerce.number().int().min(300).max(3_000),
    })
    .parse(Object.fromEntries(params));
  if (getTripConfig().demo) return nearbyDemo({ ...demoOrigin, lat, lng }, category, radius);
  const categories = category ? [category] : categorySchema.options;
  const places = (
    await Promise.all(categories.map((value) => nearbyPlaces({ lat, lng }, value, radius)))
  ).flat();
  return Array.from(new Map(places.map((place) => [place.id, place])).values());
}

export async function buildTripPlan(input: unknown) {
  const { origin, destination, places, order } = planRequestSchema.parse(input);
  const demo = getTripConfig().demo;
  const ordered =
    order === 'nearby' ? orderRoundTrip(origin, places, destination ?? origin) : places;
  const points = [origin, ...ordered, destination ?? origin];
  const pairs = points.slice(1).flatMap((to, index) => {
    const from = points[index];
    return from ? [{ from, to }] : [];
  });
  const legs = [];
  // 공급자의 순간 호출량을 줄이기 위해 동시에 세 구간까지만 조회합니다.
  for (let index = 0; index < pairs.length; index += 3) {
    legs.push(
      ...(await Promise.all(
        pairs
          .slice(index, index + 3)
          .map(({ from, to }, offset) =>
            withTraceLeg(index + offset + 1, async () =>
              demo ? createDemoLeg(from, to) : getLeg(from, to),
            ),
          ),
      )),
    );
  }
  return { places: ordered, legs, demo };
}
