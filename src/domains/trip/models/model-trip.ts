import { z } from 'zod';

export const categorySchema = z.enum(['restaurant', 'cafe', 'attraction', 'bar']);
export type Category = z.infer<typeof categorySchema>;
export const categoryLabels: Record<Category, string> = {
  restaurant: '맛집',
  cafe: '카페',
  attraction: '갈 만한 곳',
  bar: '술 한잔',
};
export const coordinateSchema = z.object({
  lat: z.number().min(32).max(39.5),
  lng: z.number().min(124).max(132),
});
export const placeSchema = coordinateSchema.extend({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(120),
  address: z.string().max(250),
  category: categorySchema,
  description: z.string().max(300),
  url: z.string().default(''),
  rating: z.number().min(1).max(5).optional(),
  userRatingCount: z.number().int().nonnegative().optional(),
  attributions: z
    .array(z.object({ name: z.string().max(300), url: z.string().optional() }))
    .optional(),
  tourism: z
    .object({
      kind: z.enum(['festival', 'pet']),
      period: z.string().max(60).optional(),
      conditions: z.string().max(1200).optional(),
    })
    .optional(),
});
export type Place = z.infer<typeof placeSchema>;
export type Coordinate = z.infer<typeof coordinateSchema>;
export const travelModeSchema = z.enum(['local', 'driving']);
export type TravelMode = z.infer<typeof travelModeSchema>;
export const segmentSchema = z.object({
  mode: z.enum(['walk', 'bus', 'subway', 'car']),
  seconds: z.number().nonnegative(),
  meters: z.number().nonnegative(),
  points: z.array(coordinateSchema),
  instruction: z.string(),
  stops: z.number().int().nonnegative().nullable(),
});
export type Segment = z.infer<typeof segmentSchema>;
export const legSchema = z.object({
  from: placeSchema,
  to: placeSchema,
  travelMode: travelModeSchema.optional(),
  segments: z.array(segmentSchema),
  warning: z.string().nullable(),
});
export type Leg = z.infer<typeof legSchema>;
export const itinerarySchema = z.object({
  places: z.array(placeSchema),
  legs: z.array(legSchema),
  demo: z.boolean(),
  externalDirections: z.boolean().optional(),
});
export type Itinerary = z.infer<typeof itinerarySchema>;
export const planRequestSchema = z
  .object({
    origin: placeSchema,
    destination: placeSchema.nullish(),
    places: z.array(placeSchema).max(5),
    order: z.enum(['nearby', 'manual']).default('nearby'),
    travelMode: travelModeSchema.default('local'),
  })
  .superRefine(({ origin, destination, places }, ctx) => {
    if (places.length === 0 && !destination) {
      ctx.addIssue({ code: 'custom', message: '방문지 또는 도착점을 선택해주세요.' });
    }
    if (destination && places.some((place) => place.id === destination.id)) {
      ctx.addIssue({ code: 'custom', message: '도착점은 방문지와 중복할 수 없습니다.' });
    }
    if (new Set([origin.id, ...places.map((place) => place.id)]).size !== places.length + 1) {
      ctx.addIssue({ code: 'custom', message: '같은 장소를 중복해서 담을 수 없습니다.' });
    }
  });
export type PlanRequest = z.infer<typeof planRequestSchema>;
