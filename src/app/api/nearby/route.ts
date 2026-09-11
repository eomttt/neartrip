import { respondToApi } from '../../../../server/api-response';
import { findNearbyPlaces } from '../../../../server/trip-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(request: Request) {
  return respondToApi(request, async () => findNearbyPlaces(new URL(request.url).searchParams));
}
