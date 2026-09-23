import 'server-only';
import { z } from 'zod';
import type { Locale } from '../src/common/i18n/locale';
import {
  coordinateSchema,
  type Category,
  type Coordinate,
  type Place,
} from '../src/domains/trip/models/model-trip';
import { distanceMeters } from '../src/domains/trip/utils/route-order';
import { ProviderError } from './provider-error';
import { traceProviderCall } from './request-trace';

const googlePlaceSchema = z.object({
  id: z.string().min(1),
  displayName: z.object({ text: z.string().min(1) }),
  formattedAddress: z.string().default(''),
  location: z.object({ latitude: z.number(), longitude: z.number() }),
  primaryType: z.string().default(''),
  types: z.array(z.string()).default([]),
  primaryTypeDisplayName: z.object({ text: z.string() }).optional(),
  addressComponents: z
    .array(z.object({ shortText: z.string().optional(), types: z.array(z.string()) }))
    .default([]),
  attributions: z
    .array(z.object({ provider: z.string(), providerUri: z.string().optional() }))
    .default([]),
});
const responseSchema = z.object({ places: z.array(googlePlaceSchema).default([]) });
const fields = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'primaryType',
  'types',
  'primaryTypeDisplayName',
  'addressComponents',
  'attributions',
]
  .map((field) => `places.${field}`)
  .join(',');
const categoryTypes: Record<Category, string[]> = {
  restaurant: ['restaurant'],
  cafe: ['cafe', 'coffee_shop'],
  attraction: ['tourist_attraction', 'museum', 'park'],
  bar: ['bar', 'pub', 'wine_bar'],
};

function placeCategory(place: z.infer<typeof googlePlaceSchema>, fallback: Category): Category {
  for (const category of ['bar', 'cafe', 'restaurant', 'attraction'] satisfies Category[]) {
    if (categoryTypes[category].includes(place.primaryType)) return category;
  }
  if (place.primaryType.endsWith('_restaurant')) return 'restaurant';
  for (const category of ['bar', 'cafe', 'restaurant', 'attraction'] satisfies Category[]) {
    if (categoryTypes[category].some((type) => place.types.includes(type))) return category;
  }
  return fallback;
}

function googlePlaceToPlace(
  place: z.infer<typeof googlePlaceSchema>,
  fallback: Category,
): Place | null {
  const coordinates = coordinateSchema.safeParse({
    lat: place.location.latitude,
    lng: place.location.longitude,
  });
  const country = place.addressComponents.find((part) => part.types.includes('country'));
  if (!coordinates.success || country?.shortText !== 'KR') return null;
  const params = new URLSearchParams({
    api: '1',
    query: place.displayName.text,
    query_place_id: place.id,
  });
  return {
    ...coordinates.data,
    id: `google:${place.id}`,
    name: place.displayName.text.slice(0, 120),
    address: place.formattedAddress.slice(0, 250),
    description: place.primaryTypeDisplayName?.text.slice(0, 300) ?? '',
    category: placeCategory(place, fallback),
    url: `https://www.google.com/maps/search/?${params}`,
    attributions: place.attributions.map((attribution) => ({
      name: attribution.provider,
      url: attribution.providerUri,
    })),
  };
}

async function requestPlaces(
  path: 'searchText' | 'searchNearby',
  body: Record<string, unknown>,
  locale: Locale,
) {
  const message = (ko: string, en: string) => (locale === 'ko' ? ko : en);
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key)
    throw new ProviderError(
      message(
        'Google 장소 검색 설정을 확인해주세요.',
        'Place search is not configured. Please try again later.',
      ),
      503,
    );
  return traceProviderCall('google', path, { language: locale }, async (record) => {
    let response: Response;
    try {
      response = await fetch(`https://places.googleapis.com/v1/places:${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': fields,
        },
        body: JSON.stringify({ ...body, languageCode: locale, regionCode: 'KR' }),
        signal: AbortSignal.timeout(12_000),
        cache: 'no-store',
      });
    } catch {
      throw new ProviderError(
        message(
          'Google 장소 검색 응답이 늦어지고 있습니다.',
          'Place search is taking longer than expected. Please try again.',
        ),
      );
    }
    record(response.status, { captured: false });
    if (!response.ok) {
      if (response.status === 429)
        throw new ProviderError(
          message(
            '장소 검색 요청이 많습니다. 잠시 후 다시 시도해주세요.',
            'Too many place searches. Please try again shortly.',
          ),
          429,
        );
      throw new ProviderError(
        message(
          'Google 장소 검색을 완료하지 못했습니다. 잠시 후 다시 시도해주세요.',
          'Could not search for places. Please try again shortly.',
        ),
        response.status === 401 || response.status === 403 ? 503 : 502,
      );
    }
    try {
      return responseSchema.parse(await response.json());
    } catch {
      throw new ProviderError(
        message(
          'Google 장소 응답을 읽지 못했습니다.',
          'Could not read the place search results. Please try again.',
        ),
        502,
      );
    }
  });
}

export async function searchGooglePlaces(query: string, locale: Locale): Promise<Place[]> {
  const response = await requestPlaces(
    'searchText',
    {
      textQuery: query,
      pageSize: 8,
      locationRestriction: {
        rectangle: {
          low: { latitude: 32, longitude: 124 },
          high: { latitude: 39.5, longitude: 132 },
        },
      },
    },
    locale,
  );
  return response.places.flatMap((row) => {
    const place = googlePlaceToPlace(row, 'attraction');
    return place ? [place] : [];
  });
}

export async function nearbyGooglePlaces(
  origin: Coordinate,
  category: Category,
  radius: number,
  locale: Locale,
): Promise<Place[]> {
  const response = await requestPlaces(
    'searchNearby',
    {
      includedTypes: categoryTypes[category],
      maxResultCount: 20,
      rankPreference: radius > 3_000 ? 'POPULARITY' : 'DISTANCE',
      locationRestriction: {
        circle: { center: { latitude: origin.lat, longitude: origin.lng }, radius },
      },
    },
    locale,
  );
  return response.places.flatMap((row) => {
    const place = googlePlaceToPlace(row, category);
    return place && distanceMeters(origin, place) <= radius ? [place] : [];
  });
}
