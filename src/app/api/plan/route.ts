import { respondToApi, readPlanBody } from '../../../../server/api-response';
import { buildTripPlan } from '../../../../server/trip-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

export function POST(request: Request) {
  return respondToApi(request, async () => buildTripPlan(await readPlanBody(request)));
}
