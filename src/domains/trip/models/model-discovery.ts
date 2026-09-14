import { z } from 'zod';
import { placeSchema } from './model-trip';
export const discoveryModeSchema = z.enum(['nearby', 'festival']);
export type DiscoveryMode = z.infer<typeof discoveryModeSchema>;
export const discoveryLabels: Record<DiscoveryMode, string> = {
  nearby: '주변 장소',
  festival: '이번 주 행사',
};
export const discoveryResultSchema = z.object({
  places: z.array(placeSchema),
  recommendations: z.array(placeSchema).default([]),
  nextPage: z.number().int().positive().nullable(),
  date: z.string(),
});
export type DiscoveryResult = z.infer<typeof discoveryResultSchema>;
