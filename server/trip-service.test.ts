import { afterEach, expect, it, vi } from 'vitest';
import { buildTripPlan } from './trip-service';
import { demoOrigin, demoPlaces } from './demo';
import { itinerarySchema } from '../src/domains/trip/models/model-trip';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it.each(['local', 'driving'])(
  '방문 순서는 유지하고 %s 경로는 외부 앱에 맡긴다',
  async (travelMode) => {
    vi.stubEnv('DEMO_MODE', 'false');
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-places-key');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const places = demoPlaces.slice(0, 2).toReversed();
    const destination = { ...demoOrigin, id: 'destination', lat: 37.58 };
    const result = itinerarySchema.parse(
      await buildTripPlan({
        origin: demoOrigin,
        destination,
        places,
        order: 'manual',
        travelMode,
      }),
    );
    expect(result).toMatchObject({ demo: false, externalDirections: true, places });
    expect(result.legs.map((leg) => leg.to.id)).toEqual([
      ...places.map((place) => place.id),
      destination.id,
    ]);
    expect(
      result.legs.every(
        (leg) => leg.segments.length === 0 && leg.warning === null && leg.travelMode === travelMode,
      ),
    ).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  },
);

it('별도 도착점이 없으면 마지막 외부 길찾기가 출발점으로 돌아온다', async () => {
  vi.stubEnv('DEMO_MODE', 'false');
  vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-places-key');
  const result = await buildTripPlan({
    origin: demoOrigin,
    places: demoPlaces.slice(0, 1),
    order: 'manual',
  });
  expect(result.legs).toHaveLength(2);
  expect(result.legs.at(-1)?.to).toEqual(demoOrigin);
});
