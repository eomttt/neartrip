import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nearbyGooglePlaces, searchGooglePlaces } from './google-places';
import { findNearbyPlaces, searchTripPlaces } from './trip-service';

const origin = { lat: 37.56, lng: 126.986 };
const row = {
  id: 'google-place-id',
  displayName: { text: 'Myeongdong Cafe' },
  formattedAddress: 'Seoul, South Korea',
  location: { latitude: origin.lat, longitude: origin.lng },
  primaryType: 'cafe',
  types: ['cafe', 'restaurant'],
  primaryTypeDisplayName: { text: 'Cafe' },
  addressComponents: [{ shortText: 'KR', types: ['country'] }],
  attributions: [{ provider: 'Local provider', providerUri: 'https://example.com/' }],
};
const fetchPlaces = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.stubEnv('GOOGLE_PLACES_API_KEY', 'server-only-test-key');
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'public-test-key');
  vi.stubEnv('DEMO_MODE', 'false');
  vi.stubGlobal('fetch', fetchPlaces);
  fetchPlaces.mockImplementation(async () => Response.json({ places: [row] }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('Google 장소 검색', () => {
  it('분류가 생략된 주소 요소가 있어도 국가 정보가 한국이면 목록을 표시한다', async () => {
    fetchPlaces.mockResolvedValue(
      Response.json({
        places: [{ ...row, addressComponents: [{ shortText: '123' }, ...row.addressComponents] }],
      }),
    );
    const places = await nearbyGooglePlaces(origin, 'restaurant', 1000, 'en');
    expect(places.map((place) => place.id)).toEqual(['google:google-place-id']);
  });
  it('영문 검색의 언어와 한국 검색 범위를 전달하고 Google 장소 ID와 출처를 보존한다', async () => {
    const places = await searchTripPlaces(
      new URLSearchParams({ q: 'Myeongdong Cafe', locale: 'en' }),
    );
    expect(places).toMatchObject([
      {
        id: 'google:google-place-id',
        name: 'Myeongdong Cafe',
        category: 'cafe',
        attributions: [{ name: 'Local provider' }],
      },
    ]);
    expect(places[0]?.url).toContain('query_place_id=google-place-id');
    const request = fetchPlaces.mock.calls[0];
    expect(request?.[0]).toBe('https://places.googleapis.com/v1/places:searchText');
    expect(JSON.parse(String(request?.[1]?.body))).toMatchObject({
      languageCode: 'en',
      regionCode: 'KR',
      textQuery: 'Myeongdong Cafe',
      pageSize: 8,
      locationRestriction: { rectangle: { low: { latitude: 32 } } },
    });
    const headers = new Headers(request?.[1]?.headers);
    expect(headers.get('X-Goog-Api-Key')).toBe('server-only-test-key');
    expect(headers.get('X-Goog-FieldMask')).not.toContain('*');
    expect(JSON.stringify(places)).not.toContain('server-only-test-key');
  });
  it('반경 밖 장소와 한국 밖 결과를 섞지 않고 카페로 분류한다', async () => {
    fetchPlaces.mockResolvedValue(
      Response.json({
        places: [
          row,
          { ...row, id: 'far', location: { latitude: 37.8, longitude: 127.2 } },
          { ...row, id: 'foreign', addressComponents: [{ shortText: 'JP', types: ['country'] }] },
        ],
      }),
    );
    const places = await nearbyGooglePlaces(origin, 'cafe', 1000, 'en');
    expect(places.map((place) => place.id)).toEqual(['google:google-place-id']);
    const body = JSON.parse(String(fetchPlaces.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({
      includedTypes: ['cafe', 'coffee_shop'],
      maxResultCount: 20,
      rankPreference: 'DISTANCE',
      languageCode: 'en',
      locationRestriction: { circle: { radius: 1000 } },
    });
  });
  it('여러 카테고리에서 반환한 같은 장소는 한 번만 보여준다', async () => {
    const places = await findNearbyPlaces(
      new URLSearchParams({
        ...Object.fromEntries(Object.entries(origin).map(([key, value]) => [key, String(value)])),
        radius: '1000',
        locale: 'en',
      }),
    );
    expect(places).toHaveLength(1);
    expect(fetchPlaces).toHaveBeenCalledTimes(4);
    expect(
      fetchPlaces.mock.calls.every(
        (call) => JSON.parse(String(call[1]?.body)).languageCode === 'en',
      ),
    ).toBe(true);
  });
  it('주변 목록에만 평점과 리뷰 수를 요청하고 누락된 평점은 만들지 않는다', async () => {
    fetchPlaces.mockResolvedValueOnce(
      Response.json({ places: [{ ...row, rating: 4.6, userRatingCount: 1234 }] }),
    );
    const places = await nearbyGooglePlaces(origin, 'cafe', 1000, 'en');
    expect(places[0]).toMatchObject({ rating: 4.6, userRatingCount: 1234 });
    const nearbyHeaders = new Headers(fetchPlaces.mock.calls[0]?.[1]?.headers);
    expect(nearbyHeaders.get('X-Goog-FieldMask')).toContain('places.rating,places.userRatingCount');
    const results = await searchGooglePlaces('hotel', 'en');
    const textHeaders = new Headers(fetchPlaces.mock.calls[1]?.[1]?.headers);
    expect(textHeaders.get('X-Goog-FieldMask')).not.toMatch(
      /rating|userRatingCount|reviews|photos/,
    );
    expect(results[0]?.rating).toBeUndefined();
  });
  it('검색 결과가 없으면 빈 목록을 반환한다', async () => {
    fetchPlaces.mockResolvedValue(Response.json({}));
    await expect(searchGooglePlaces('no results', 'en')).resolves.toEqual([]);
  });
  it('잘못된 공급자 응답을 검색 결과 없음으로 숨기지 않는다', async () => {
    fetchPlaces.mockResolvedValue(Response.json({ places: [{ id: 'broken' }] }));
    await expect(searchGooglePlaces('hotel', 'en')).rejects.toMatchObject({ status: 502 });
  });
  it('호출 제한을 재시도하지 않고 키와 공급자 오류 본문을 노출하지 않는다', async () => {
    fetchPlaces.mockResolvedValue(
      Response.json({ error: 'server-only-test-key' }, { status: 429 }),
    );
    await expect(searchGooglePlaces('hotel', 'en')).rejects.toMatchObject({
      status: 429,
      message: 'Too many place searches. Please try again shortly.',
    });
    expect(fetchPlaces).toHaveBeenCalledTimes(1);
  });
  it('검색 키 누락과 잘못된 언어를 요청 전에 거부한다', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', '');
    await expect(searchGooglePlaces('hotel', 'en')).rejects.toMatchObject({ status: 503 });
    await expect(
      searchTripPlaces(new URLSearchParams({ q: 'hotel', locale: 'invalid' })),
    ).rejects.toThrow();
    expect(fetchPlaces).not.toHaveBeenCalled();
  });
});
