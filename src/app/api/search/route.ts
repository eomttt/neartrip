import { respondToApi } from '../../../../server/api-response';
import { searchTripPlaces } from '../../../../server/trip-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(request: Request) {
  return respondToApi(request, async () => searchTripPlaces(new URL(request.url).searchParams));
}
