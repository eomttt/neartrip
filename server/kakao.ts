import { z } from 'zod';
import type { Category, Leg, Place, Segment } from '../src/domains/trip/models/model-trip';

export class ProviderError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

async function requestKakao(path: string, params: Record<string, string>): Promise<unknown> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) throw new ProviderError('카카오 REST API 키가 설정되지 않았습니다.', 503);
  let response: Response;
  try {
    response = await fetch(`https://dapi.kakao.com${path}?${new URLSearchParams(params)}`, {
      headers: { Authorization: `KakaoAK ${key}` },
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new ProviderError('카카오 응답이 늦어지고 있습니다. 잠시 후 다시 시도해주세요.');
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403)
      throw new ProviderError('카카오 API 키 또는 사용 권한을 확인해주세요.', 503);
    if (response.status === 429)
      throw new ProviderError(
        '카카오 API 호출 한도에 도달했습니다. 잠시 후 다시 시도해주세요.',
        429,
      );
    throw new ProviderError(`카카오 서비스에서 요청을 완료하지 못했습니다. (${response.status})`);
  }
  return response.json();
}

const documentSchema = z.object({
  id: z.string(),
  place_name: z.string(),
  address_name: z.string(),
  road_address_name: z.string().default(''),
  category_group_code: z.string().default(''),
  category_name: z.string().default(''),
  x: z.coerce.number(),
  y: z.coerce.number(),
  place_url: z.string().default(''),
});
const placesResponseSchema = z.object({ documents: z.array(documentSchema) });
const categoryCodes: Record<Category, string> = {
  restaurant: 'FD6',
  cafe: 'CE7',
  attraction: 'AT4',
};

function documentToPlace(document: z.infer<typeof documentSchema>): Place {
  return {
    id: document.id,
    name: document.place_name,
    address: document.road_address_name || document.address_name,
    category:
      document.category_group_code === 'FD6'
        ? 'restaurant'
        : document.category_group_code === 'CE7'
          ? 'cafe'
          : 'attraction',
    description: document.category_name.split(' > ').at(-1) || '주변에서 발견한 장소',
    lat: document.y,
    lng: document.x,
    url: document.place_url,
  };
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const response = placesResponseSchema.parse(
    await requestKakao('/v2/local/search/keyword.json', { query, size: '8' }),
  );
  return response.documents.map(documentToPlace);
}

export async function nearbyPlaces(
  origin: { lat: number; lng: number },
  category: Category,
  radius: number,
): Promise<Place[]> {
  const response = placesResponseSchema.parse(
    await requestKakao('/v2/local/search/category.json', {
      category_group_code: categoryCodes[category],
      x: String(origin.lng),
      y: String(origin.lat),
      radius: String(radius),
      sort: 'distance',
      size: '15',
    }),
  );
  return response.documents.map(documentToPlace);
}

const pathSchema = z.object({ points: z.array(z.tuple([z.number(), z.number()])).min(2) });
const walkStepSchema = z.object({
  properties: z.object({
    distance: z.number().nonnegative(),
    time: z.number().nonnegative(),
    guidance: z.string(),
  }),
  path: pathSchema,
});
const walkResponseSchema = z.object({
  status: z.string(),
  route: z
    .object({ legs: z.array(z.object({ steps: z.array(walkStepSchema).min(1) })).min(1) })
    .optional(),
});
const transitResponseSchema = z.object({
  status: z.string(),
  routes: z
    .array(
      z.object({
        properties: z.object({ totalTime: z.number().nonnegative() }),
        steps: z
          .array(
            z.object({
              properties: z.object({
                type: z.enum(['WALKING', 'BUS', 'SUBWAY']),
                distance: z.number().nonnegative(),
                time: z.number().nonnegative(),
                guidance: z.string(),
                stops: z.array(z.object({ name: z.string() })).optional(),
              }),
              path: pathSchema,
            }),
          )
          .min(1),
      }),
    )
    .optional(),
});

function routeParams(from: Place, to: Place) {
  return {
    start_x: String(from.lng),
    start_y: String(from.lat),
    end_x: String(to.lng),
    end_y: String(to.lat),
    output_coord: 'WGS84',
  };
}

export function walkResponseToSegments(value: unknown): Segment[] {
  const data = walkResponseSchema.parse(value);
  if (data.status !== 'OK' || !data.route) return [];
  return data.route.legs.flatMap((leg) =>
    leg.steps.map((step) => ({
      mode: 'walk',
      seconds: step.properties.time,
      meters: step.properties.distance,
      instruction: step.properties.guidance,
      stops: 0,
      points: step.path.points.map(([lng, lat]) => ({ lng, lat })),
    })),
  );
}

export function transitResponseToCandidates(value: unknown): Segment[][] {
  const data = transitResponseSchema.parse(value);
  if (data.status !== 'OK' || !data.routes) return [];
  return data.routes
    .toSorted((a, b) => a.properties.totalTime - b.properties.totalTime)
    .map((route) =>
      route.steps.map((step) => ({
        mode:
          step.properties.type === 'WALKING'
            ? 'walk'
            : step.properties.type === 'BUS'
              ? 'bus'
              : 'subway',
        seconds: step.properties.time,
        meters: step.properties.distance,
        instruction: step.properties.guidance,
        // 실응답으로 승하차 포함 규칙을 확인하기 전에는 목록 전체를 세어 보수적으로 제한합니다.
        stops:
          step.properties.type === 'WALKING'
            ? 0
            : step.properties.stops?.length
              ? step.properties.stops.length
              : null,
        points: step.path.points.map(([lng, lat]) => ({ lng, lat })),
      })),
    );
}

export function isShortTransit(segments: Segment[]): boolean {
  const transit = segments.filter((segment) => segment.mode !== 'walk');
  return (
    transit.length > 0 &&
    transit.every((segment) => segment.stops !== null) &&
    transit.reduce((sum, segment) => sum + (segment.stops ?? 0), 0) <= 5 &&
    segments
      .filter((segment) => segment.mode === 'walk')
      .reduce((sum, segment) => sum + segment.seconds, 0) <=
      20 * 60
  );
}

export async function getLeg(from: Place, to: Place): Promise<Leg> {
  if (from.lat === to.lat && from.lng === to.lng) return { from, to, segments: [], warning: null };
  const walk = walkResponseToSegments(
    await requestKakao('/v2/routing/walk', routeParams(from, to)),
  );
  if (walk.length > 0 && walk.reduce((sum, segment) => sum + segment.seconds, 0) <= 20 * 60) {
    return { from, to, segments: walk, warning: null };
  }
  const candidates = transitResponseToCandidates(
    await requestKakao('/v2/routing/publictraffic', routeParams(from, to)),
  );
  const transit = candidates.find(isShortTransit);
  if (transit) return { from, to, segments: transit, warning: null };
  return {
    from,
    to,
    segments: [],
    warning:
      '도보 20분 또는 대중교통 5정거장 이내의 경로를 확인하지 못했어요. 장소를 바꾸거나 순서를 조정해주세요.',
  };
}
