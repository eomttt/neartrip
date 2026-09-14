import 'server-only';
import { z } from 'zod';
import { traceKakaoCall } from './request-trace';
import type {
  Category,
  Coordinate,
  Leg,
  Place,
  Segment,
} from '../src/domains/trip/models/model-trip';
import { distanceMeters } from '../src/domains/trip/utils/route-order';

import { ProviderError } from './provider-error';
export { ProviderError } from './provider-error';

async function requestKakao<T>(
  path: string,
  params: Record<string, string>,
  parse: (value: unknown) => T,
): Promise<T> {
  return traceKakaoCall(path, params, async (record) => {
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
    record(response.status, { captured: false });
    let body: unknown;
    try {
      body = await response.json();
      record(response.status, body);
    } catch (error) {
      record(response.status, { captured: false, reason: 'invalid_json' });
      if (response.ok) throw error;
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
    return parse(body);
  });
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
const categoryCodes: Record<Exclude<Category, 'bar'>, string> = {
  restaurant: 'FD6',
  cafe: 'CE7',
  attraction: 'AT4',
};

function documentToPlace(
  document: z.infer<typeof documentSchema>,
  categoryOverride?: Category,
): Place {
  return {
    id: document.id,
    name: document.place_name,
    address: document.road_address_name || document.address_name,
    category:
      categoryOverride ??
      (document.category_group_code === 'FD6'
        ? 'restaurant'
        : document.category_group_code === 'CE7'
          ? 'cafe'
          : 'attraction'),
    description: document.category_name.split(' > ').at(-1) || '주변에서 발견한 장소',
    lat: document.y,
    lng: document.x,
    url: document.place_url,
  };
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const response = await requestKakao(
    '/v2/local/search/keyword.json',
    { query, size: '8' },
    (value) => placesResponseSchema.parse(value),
  );
  return response.documents.map((document) => documentToPlace(document));
}

export async function nearbyPlaces(
  origin: { lat: number; lng: number },
  category: Category,
  radius: number,
): Promise<Place[]> {
  if (category === 'bar') {
    const response = await requestKakao(
      '/v2/local/search/keyword.json',
      {
        query: '술집',
        category_group_code: 'FD6',
        x: String(origin.lng),
        y: String(origin.lat),
        radius: String(radius),
        sort: 'distance',
        size: '15',
      },
      (value) => placesResponseSchema.parse(value),
    );
    return response.documents.map((document) => documentToPlace(document, 'bar'));
  }
  const response = await requestKakao(
    '/v2/local/search/category.json',
    {
      category_group_code: categoryCodes[category],
      x: String(origin.lng),
      y: String(origin.lat),
      radius: String(radius),
      sort: 'distance',
      size: '15',
    },
    (value) => placesResponseSchema.parse(value),
  );
  return response.documents.map((document) => documentToPlace(document));
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
const routingStatusSchema = z.object({ status: z.string() });
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

function routeParams(from: Coordinate, to: Coordinate) {
  return {
    start_x: String(from.lng),
    start_y: String(from.lat),
    end_x: String(to.lng),
    end_y: String(to.lat),
    output_coord: 'WGS84',
  };
}

export function walkResponseToSegments(value: unknown): Segment[] {
  if (routingStatusSchema.parse(value).status !== 'OK') return [];
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
        // 실응답의 stops는 승차·하차 지점을 모두 포함하므로 이동 정거장은 목록 길이에서 1을 뺍니다.
        stops:
          step.properties.type === 'WALKING'
            ? 0
            : step.properties.stops && step.properties.stops.length >= 2
              ? step.properties.stops.length - 1
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

async function getWalkRoute(from: Coordinate, to: Coordinate) {
  return requestKakao('/v2/routing/walk', routeParams(from, to), (value) => ({
    samePoint: routingStatusSchema.parse(value).status === 'SAME_POINT',
    segments: walkResponseToSegments(value),
  }));
}

async function completeTransitWalks(
  from: Coordinate,
  to: Coordinate,
  segments: Segment[],
): Promise<{ segments: Segment[]; connected: boolean }> {
  const complete: Segment[] = [];
  let connected = true;
  let current = from;
  for (const segment of segments) {
    const start = segment.points[0];
    const end = segment.points.at(-1);
    if (!start || !end) return { segments, connected: false };
    // 교통 경로와 장소 좌표 사이의 10m 이하 오차는 같은 지점으로 봅니다.
    if (distanceMeters(current, start) > 10) {
      const connection = await getWalkRoute(current, start);
      if (!connection.samePoint && connection.segments.length === 0) connected = false;
      complete.push(...connection.segments);
    }
    complete.push(segment);
    current = end;
  }
  if (distanceMeters(current, to) > 10) {
    const connection = await getWalkRoute(current, to);
    if (!connection.samePoint && connection.segments.length === 0) connected = false;
    complete.push(...connection.segments);
  }
  return { segments: complete, connected };
}

function totalSeconds(segments: Segment[]): number {
  return segments.reduce((sum, segment) => sum + segment.seconds, 0);
}

function routeWarning(segments: Segment[], connected: boolean): string | null {
  const warnings: string[] = [];
  const walking = segments.filter((segment) => segment.mode === 'walk');
  const transit = segments.filter((segment) => segment.mode !== 'walk');
  if (totalSeconds(walking) > 20 * 60) {
    warnings.push(
      `도보 이동이 ${Math.ceil(totalSeconds(walking) / 60)}분으로 권장 기준인 20분을 넘어요.`,
    );
  }
  if (transit.some((segment) => segment.stops === null)) {
    warnings.push('대중교통 정거장 수를 확인하지 못했어요.');
  } else {
    const stops = transit.reduce((sum, segment) => sum + (segment.stops ?? 0), 0);
    if (stops > 5) warnings.push(`대중교통이 ${stops}정거장으로 권장 기준인 5정거장을 넘어요.`);
  }
  if (!connected) warnings.push('일부 연결 도보를 찾지 못해 확인된 경로만 표시해요.');
  return warnings.length > 0 ? warnings.join(' ') : null;
}

export async function getLeg(from: Place, to: Place): Promise<Leg> {
  if (from.lat === to.lat && from.lng === to.lng) return { from, to, segments: [], warning: null };
  const walking = await getWalkRoute(from, to);
  if (walking.samePoint) {
    return {
      from,
      to,
      segments: [],
      warning: '카카오맵에서 같은 지점으로 안내되는 구간이에요. 현장에서 위치를 확인해주세요.',
    };
  }
  const walk = walking.segments;
  if (walk.length > 0 && totalSeconds(walk) <= 20 * 60) {
    return { from, to, segments: walk, warning: null };
  }
  const candidates = await requestKakao(
    '/v2/routing/publictraffic',
    routeParams(from, to),
    transitResponseToCandidates,
  );
  let fallback = walk.length > 0 ? { segments: walk, connected: true } : null;
  // 권장 조건에 맞는 경로를 우선하고, 없으면 조회된 경로를 경고와 함께 유지합니다.
  for (const candidate of candidates.toSorted(
    (a, b) => Number(isShortTransit(b)) - Number(isShortTransit(a)),
  )) {
    const transit = await completeTransitWalks(from, to, candidate);
    if (transit.connected && isShortTransit(transit.segments)) {
      return { from, to, segments: transit.segments, warning: null };
    }
    if (
      !fallback ||
      (transit.connected && !fallback.connected) ||
      (transit.connected === fallback.connected &&
        totalSeconds(transit.segments) < totalSeconds(fallback.segments))
    ) {
      fallback = transit;
    }
  }
  if (fallback) {
    return {
      from,
      to,
      segments: fallback.segments,
      warning: routeWarning(fallback.segments, fallback.connected),
    };
  }
  return {
    from,
    to,
    segments: [],
    warning: '이 구간의 이동 경로를 찾지 못했어요. 장소나 방문 순서를 확인해주세요.',
  };
}
