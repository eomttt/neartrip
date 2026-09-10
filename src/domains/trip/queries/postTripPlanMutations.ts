import { mutationOptions } from '@tanstack/react-query';
import { requestJson } from '@/common/http/request-json';
import { itinerarySchema, type PlanRequest } from '../models/model-trip';

interface PlanVariables {
  body: PlanRequest;
  signal: AbortSignal;
}
export const postTripPlanMutations = {
  create: () =>
    mutationOptions({
      mutationFn: async ({ body, signal }: PlanVariables) =>
        itinerarySchema.parse(
          await requestJson('/api/plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal,
          }),
        ),
    }),
};
