import { z } from 'zod';
import { coordinateSchema } from './model-trip';
export const crowdingLevelSchema = z.enum(['여유', '보통', '약간 붐빔', '붐빔']);
export type CrowdingLevel = z.infer<typeof crowdingLevelSchema>;
export const crowdingSchema = z.object({
  state: z.enum(['available', 'unsupported', 'not_configured', 'unavailable', 'stale']),
  areaName: z.string().nullable(),
  level: crowdingLevelSchema.nullable(),
  observedAt: z.iso.datetime({ offset: true }).nullable(),
  replacement: z.boolean(),
  demo: z.boolean(),
});
export type Crowding = z.infer<typeof crowdingSchema>;
export const crowdingRequestSchema = z.object({
  places: z.array(coordinateSchema.extend({ id: z.string().min(1).max(100) })).max(100),
});
export const crowdingResponseSchema = z.record(z.string(), crowdingSchema);
export type CrowdingByPlace = z.infer<typeof crowdingResponseSchema>;
