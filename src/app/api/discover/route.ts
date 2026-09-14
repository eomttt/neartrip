import { respondToApi } from '../../../../server/api-response';
import { discoverTripPlaces } from '../../../../server/discovery-service';
export const runtime = 'nodejs';
export function GET(request: Request) {
  return respondToApi(request, () => discoverTripPlaces(new URL(request.url).searchParams));
}
