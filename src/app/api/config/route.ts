import { respondToApi } from '../../../../server/api-response';
import { getTripConfig } from '../../../../server/trip-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(request: Request) {
  return respondToApi(request, async () => getTripConfig());
}
