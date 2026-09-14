import { readPlanBody, respondToApi } from '../../../../server/api-response';
import { findPlaceCrowding } from '../../../../server/seoul-crowding';
export const runtime = 'nodejs';
export function POST(request: Request) {
  return respondToApi(request, async () => findPlaceCrowding(await readPlanBody(request)));
}
