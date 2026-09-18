import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getLeg,
  isShortTransit,
  nearbyPlaces,
  transitResponseToCandidates,
  walkResponseToSegments,
} from './kakao';
import { categorySchema, type Segment } from '../src/domains/trip/models/model-trip';
import { demoOrigin } from './demo';
import { buildTripPlan } from './trip-service';

function transit(stops: number | null): Segment {
  return { mode: 'bus', seconds: 300, meters: 1_000, instruction: '버스', stops, points: [] };
}

describe('이동 제한과 응답 검증', () => {
  it('환승 전후 정거장을 합산한다', () => {
    expect(isShortTransit([transit(3), transit(2)])).toBe(true);
    expect(isShortTransit([transit(3), transit(3)])).toBe(false);
  });
  it('정거장 정보가 없거나 도보 연결이 20분을 넘으면 통과시키지 않는다', () => {
    expect(isShortTransit([transit(null)])).toBe(false);
    expect(isShortTransit([transit(2), { ...transit(0), mode: 'walk', seconds: 1_201 }])).toBe(
      false,
    );
  });
  it('도보 응답의 경도/위도를 뒤집지 않는다', () => {
    const segments = walkResponseToSegments({
      status: 'OK',
      route: {
        legs: [
          {
            steps: [
              {
                properties: { time: 120, distance: 150, guidance: '골목길' },
                path: {
                  points: [
                    [127.05, 37.54],
                    [127.06, 37.55],
                  ],
                },
              },
            ],
          },
        ],
      },
    });
    expect(segments[0]?.points[0]).toEqual({ lng: 127.05, lat: 37.54 });
  });
  it('경로가 없으면 직선으로 대체하지 않는다', () => {
    expect(walkResponseToSegments({ status: 'ROUTE_RESULT_NOT_FOUND' })).toEqual([]);
    expect(transitResponseToCandidates({ status: 'NO_RESULTS' })).toEqual([]);
  });
  it('알 수 없는 형식을 빈 성공으로 숨기지 않는다', () => {
    expect(() => walkResponseToSegments({ status: 'OK', route: {} })).toThrow();
  });
});

describe('차량·택시 경로', () => {
  const destination = { ...demoOrigin, id: 'driving-destination', lat: 37.59 };
  const response = {
    routes: [
      {
        result_code: 0,
        summary: { distance: 12_500, duration: 1_800 },
        sections: [{ roads: [{ vertexes: [127.05598, 37.54458, 127.06, 37.59] }] }],
      },
    ],
  };

  it('자동차 API의 실제 거리·시간·좌표를 사용하고 도보 제한을 적용하지 않는다', async () => {
    vi.stubEnv('KAKAO_REST_API_KEY', 'test-only-key');
    const fetchMock = vi.fn().mockResolvedValue(Response.json(response));
    vi.stubGlobal('fetch', fetchMock);

    const leg = await getLeg(demoOrigin, destination, 'driving');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.origin + url.pathname).toBe('https://apis-navi.kakaomobility.com/v1/directions');
    expect(url.searchParams.get('origin')).toBe(`${demoOrigin.lng},${demoOrigin.lat}`);
    expect(url.searchParams.get('destination')).toBe(`${destination.lng},${destination.lat}`);
    expect(leg).toMatchObject({
      travelMode: 'driving',
      warning: null,
      segments: [
        {
          mode: 'car',
          meters: 12_500,
          seconds: 1_800,
          stops: null,
          points: [
            { lng: 127.05598, lat: 37.54458 },
            { lng: 127.06, lat: 37.59 },
          ],
        },
      ],
    });
  });

  it('차량 경로가 없으면 직선이나 도보 경로로 바꾸지 않는다', async () => {
    vi.stubEnv('KAKAO_REST_API_KEY', 'test-only-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          routes: [{ result_code: 104, result_msg: '경로 없음' }],
        }),
      ),
    );
    const leg = await getLeg(demoOrigin, destination, 'driving');
    expect(leg.travelMode).toBe('driving');
    expect(leg.segments).toEqual([]);
    expect(leg.warning).toContain('차량 경로를 찾지 못했어요');
  });

  it('성공 응답의 좌표가 불완전하면 형식 오류를 드러낸다', async () => {
    vi.stubEnv('KAKAO_REST_API_KEY', 'test-only-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          routes: [
            {
              result_code: 0,
              summary: { distance: 100, duration: 10 },
              sections: [{ roads: [{ vertexes: [127, 37, 128, 38, 129] }] }],
            },
          ],
        }),
      ),
    );
    await expect(getLeg(demoOrigin, destination, 'driving')).rejects.toThrow();
  });

  it('넓은 반경에서는 가까운 곳에만 결과가 몰리지 않게 정확도순으로 조회한다', async () => {
    vi.stubEnv('KAKAO_REST_API_KEY', 'test-only-key');
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ documents: [], meta: { is_end: true, pageable_count: 0 } }),
      );
    vi.stubGlobal('fetch', fetchMock);
    await nearbyPlaces(demoOrigin, 'attraction', 20_000);
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    expect(url.searchParams.get('radius')).toBe('20000');
    expect(url.searchParams.get('sort')).toBe('accuracy');
  });
});

function walkResponse(seconds: number) {
  return {
    status: 'OK',
    route: {
      legs: [
        {
          steps: [
            {
              properties: { time: seconds, distance: 150, guidance: '연결 도보' },
              path: {
                points: [
                  [127.05, 37.54],
                  [127.06, 37.55],
                ],
              },
            },
          ],
        },
      ],
    },
  };
}

function transitStep(stops: string[]) {
  return {
    properties: {
      type: 'SUBWAY',
      time: 630,
      distance: 6500,
      guidance: '2호선',
      stops: stops.map((name) => ({ name })),
    },
    path: {
      points: [
        [127.05, 37.54],
        [127.06, 37.55],
      ],
    },
  };
}

function apiResponse(value: unknown) {
  return new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function nearbyPage(ids: string[], isEnd: boolean, pageableCount = 45, categoryCode = 'FD6') {
  return Response.json({
    meta: { is_end: isEnd, pageable_count: pageableCount },
    documents: ids.map((id) => ({
      id,
      place_name: `장소 ${id}`,
      address_name: '전북특별자치도 군산시',
      category_group_code: categoryCode,
      x: '126.688',
      y: '35.964',
    })),
  });
}

describe('주변 장소 전체 페이지 조회', () => {
  it.each(categorySchema.options)('%s의 세 페이지를 끝까지 모은다', async (category) => {
    vi.stubEnv('KAKAO_REST_API_KEY', 'test-only-key');
    const ids = Array.from({ length: 45 }, (_, index) => String(index + 1));
    const code = category === 'cafe' ? 'CE7' : category === 'attraction' ? 'AT4' : 'FD6';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(nearbyPage(ids.slice(0, 15), false, 45, code))
      .mockResolvedValueOnce(nearbyPage(ids.slice(15, 30), false, 45, code))
      .mockResolvedValueOnce(nearbyPage(ids.slice(30), true, 45, code));
    vi.stubGlobal('fetch', fetchMock);

    const places = await nearbyPlaces(demoOrigin, category, 1_000);

    expect(places.map((place) => place.id)).toEqual(ids);
    expect(places.every((place) => place.category === category)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const urls = fetchMock.mock.calls.map(([url]) => new URL(String(url)));
    expect(urls.map((url) => url.searchParams.get('page'))).toEqual(['1', '2', '3']);
    for (const url of urls) {
      expect(url.pathname).toBe(
        category === 'bar' ? '/v2/local/search/keyword.json' : '/v2/local/search/category.json',
      );
      expect(Object.fromEntries(url.searchParams)).toMatchObject({
        category_group_code: code,
        x: String(demoOrigin.lng),
        y: String(demoOrigin.lat),
        radius: '1000',
        sort: 'distance',
        size: '15',
      });
      expect(url.searchParams.get('query')).toBe(category === 'bar' ? '술집' : null);
    }
  });

  it('마지막 페이지에서 멈추고 페이지 사이의 중복 장소를 합친다', async () => {
    vi.stubEnv('KAKAO_REST_API_KEY', 'test-only-key');
    const firstIds = Array.from({ length: 15 }, (_, index) => String(index + 1));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(nearbyPage(firstIds, false, 17))
      .mockResolvedValueOnce(nearbyPage(['15', '16'], true, 17));
    vi.stubGlobal('fetch', fetchMock);

    const places = await nearbyPlaces(demoOrigin, 'restaurant', 1_000);

    expect(places.map((place) => place.id)).toEqual([...firstIds, '16']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    { label: '마지막 페이지', ids: ['1'], isEnd: true, count: 45 },
    { label: '조회 가능한 결과 소진', ids: ['1'], isEnd: false, count: 1 },
    { label: '빈 결과', ids: [], isEnd: false, count: 45 },
  ])('$label 뒤에는 추가 요청을 보내지 않는다', async ({ ids, isEnd, count }) => {
    vi.stubEnv('KAKAO_REST_API_KEY', 'test-only-key');
    const fetchMock = vi.fn().mockResolvedValueOnce(nearbyPage(ids, isEnd, count));
    vi.stubGlobal('fetch', fetchMock);

    const places = await nearbyPlaces(demoOrigin, 'restaurant', 1_000);

    expect(places.map((place) => place.id)).toEqual(ids);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('마지막 페이지 표시가 잘못되어도 제공 한도를 넘겨 반복하지 않는다', async () => {
    vi.stubEnv('KAKAO_REST_API_KEY', 'test-only-key');
    const ids = Array.from({ length: 45 }, (_, index) => String(index + 1));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(nearbyPage(ids.slice(0, 15), false, 100))
      .mockResolvedValueOnce(nearbyPage(ids.slice(15, 30), false, 100))
      .mockResolvedValueOnce(nearbyPage(ids.slice(30), false, 100));
    vi.stubGlobal('fetch', fetchMock);

    const places = await nearbyPlaces(demoOrigin, 'restaurant', 1_000);

    expect(places.map((place) => place.id)).toEqual(ids);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('다음 페이지 요청이 실패하면 일부 결과를 전체 결과로 반환하지 않는다', async () => {
    vi.stubEnv('KAKAO_REST_API_KEY', 'test-only-key');
    const ids = Array.from({ length: 15 }, (_, index) => String(index + 1));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(nearbyPage(ids, false))
      .mockResolvedValueOnce(Response.json({ message: 'rate limited' }, { status: 429 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(nearbyPlaces(demoOrigin, 'restaurant', 1_000)).rejects.toThrow('호출 한도');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('페이지 정보가 빠진 응답을 전체 결과로 받아들이지 않는다', async () => {
    vi.stubEnv('KAKAO_REST_API_KEY', 'test-only-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ documents: [] })));

    await expect(nearbyPlaces(demoOrigin, 'restaurant', 1_000)).rejects.toThrow();
  });
});

describe('카카오 실응답에서 확인한 대중교통 경계', () => {
  it('술 한잔은 주변 술집 키워드로 조회하고 별도 카테고리로 반환한다', async () => {
    vi.stubEnv('KAKAO_REST_API_KEY', 'test-only-key');
    const fetchMock = vi.fn().mockResolvedValue(
      apiResponse({
        meta: { is_end: true, pageable_count: 1 },
        documents: [
          {
            id: 'bar-1',
            place_name: '저녁의 잔',
            address_name: '서울 성동구 성수동',
            road_address_name: '서울 성동구 연무장길 1',
            category_group_code: 'FD6',
            category_name: '음식점 > 술집',
            x: '127.055',
            y: '37.544',
            place_url: 'https://place.map.kakao.com/1',
          },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const places = await nearbyPlaces({ lat: 37.544, lng: 127.055 }, 'bar', 1_000);
    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(requestUrl.pathname).toBe('/v2/local/search/keyword.json');
    expect(requestUrl.searchParams.get('query')).toBe('술집');
    expect(requestUrl.searchParams.get('category_group_code')).toBe('FD6');
    expect(places[0]?.category).toBe('bar');
  });

  it.each([
    { stops: ['성수', '건대입구'], count: 1, allowed: true },
    { stops: ['성수', '건대입구', '구의', '강변', '잠실나루', '잠실'], count: 5, allowed: true },
    {
      stops: ['성수', '건대입구', '구의', '강변', '잠실나루', '잠실', '잠실새내'],
      count: 6,
      allowed: false,
    },
  ])('승차역을 제외해 $count 정거장으로 계산한다', ({ stops, count, allowed }) => {
    const candidates = transitResponseToCandidates({
      status: 'OK',
      routes: [{ properties: { totalTime: 630 }, steps: [transitStep(stops)] }],
    });
    expect(candidates[0]?.[0]?.stops).toBe(count);
    expect(isShortTransit(candidates[0] ?? [])).toBe(allowed);
  });

  it('환승하는 각 구간에서 승차 지점을 한 번씩 제외한다', () => {
    const candidates = transitResponseToCandidates({
      status: 'OK',
      routes: [
        {
          properties: { totalTime: 1260 },
          steps: [transitStep(['A', 'B', 'C']), transitStep(['C', 'D', 'E', 'F'])],
        },
      ],
    });
    expect(candidates[0]?.map((segment) => segment.stops)).toEqual([2, 3]);
    expect(isShortTransit(candidates[0] ?? [])).toBe(true);
  });

  it('승하차 지점을 확인할 수 없는 목록은 허용하지 않는다', () => {
    const candidates = transitResponseToCandidates({
      status: 'OK',
      routes: [{ properties: { totalTime: 630 }, steps: [transitStep(['성수'])] }],
    });
    expect(candidates[0]?.[0]?.stops).toBeNull();
    expect(isShortTransit(candidates[0] ?? [])).toBe(false);
  });

  it.each([
    { connectionSeconds: 120, found: true, allowed: true },
    { connectionSeconds: 601, found: true, allowed: false },
    { connectionSeconds: 120, found: false, allowed: false },
  ])(
    '빠진 연결 도보를 조회하고 제한을 검사한다: $connectionSeconds / $found',
    async ({ connectionSeconds, found, allowed }) => {
      vi.stubEnv('KAKAO_REST_API_KEY', 'test-only-key');
      const connection = found
        ? walkResponse(connectionSeconds)
        : { status: 'ROUTE_RESULT_NOT_FOUND' };
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(apiResponse(walkResponse(1201)))
        .mockResolvedValueOnce(
          apiResponse({
            status: 'OK',
            routes: [
              { properties: { totalTime: 630 }, steps: [transitStep(['성수', '건대입구'])] },
            ],
          }),
        )
        .mockResolvedValueOnce(apiResponse(connection))
        .mockResolvedValueOnce(apiResponse(connection));
      vi.stubGlobal('fetch', fetchMock);

      const leg = await getLeg(demoOrigin, {
        ...demoOrigin,
        id: 'destination',
        lat: 37.56,
        lng: 127.07,
      });

      if (allowed) {
        expect(leg.warning).toBeNull();
        expect(leg.segments.map((segment) => segment.mode)).toEqual(['walk', 'subway', 'walk']);
        expect(leg.segments.reduce((sum, segment) => sum + segment.seconds, 0)).toBe(870);
      } else {
        expect(leg.warning).not.toBeNull();
        expect(leg.segments.map((segment) => segment.mode)).toEqual(['walk']);
        expect(leg.warning).toContain('20분');
      }
    },
  );
});

const from = { ...demoOrigin, lat: 37.54, lng: 127.05 };
const to = { ...demoOrigin, id: 'destination', lat: 37.55, lng: 127.06 };

function mockRoutes(walk: unknown, steps: ReturnType<typeof transitStep>[]) {
  vi.stubEnv('KAKAO_REST_API_KEY', 'test-only-key');
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(apiResponse(walk))
    .mockResolvedValueOnce(
      apiResponse({
        status: 'OK',
        routes: steps.map((step) => ({
          properties: { totalTime: step.properties.time },
          steps: [step],
        })),
      }),
    );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('권장 조건을 넘는 경로도 경고와 함께 표시', () => {
  it('대중교통이 없으면 20분이 넘는 실제 도보 경로를 유지한다', async () => {
    mockRoutes(walkResponse(1500), []);
    const leg = await getLeg(from, to);
    expect(leg.warning).toContain('25분');
    expect(leg.segments).toEqual(walkResponseToSegments(walkResponse(1500)));
  });

  it('6정거장 경로의 좌표와 이동 안내를 보존한다', async () => {
    const step = transitStep(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    mockRoutes({ status: 'NO_RESULTS' }, [step]);
    const leg = await getLeg(from, to);
    expect(leg.warning).toContain('6정거장');
    expect(leg.segments[0]).toMatchObject({
      mode: 'subway',
      stops: 6,
      instruction: '2호선',
      points: [
        { lng: 127.05, lat: 37.54 },
        { lng: 127.06, lat: 37.55 },
      ],
    });
  });

  it('더 빠른 초과 경로가 있어도 권장 조건에 맞는 대중교통을 우선한다', async () => {
    const short = transitStep(['A', 'B']);
    short.properties.time = 900;
    mockRoutes(walkResponse(1500), [transitStep(['A', 'B', 'C', 'D', 'E', 'F', 'G']), short]);
    const leg = await getLeg(from, to);
    expect(leg.warning).toBeNull();
    expect(leg.segments[0]?.stops).toBe(1);
    expect(leg.segments[0]?.seconds).toBe(900);
  });

  it('권장 조건에 맞는 경로가 없으면 완성된 후보 중 이동 시간이 짧은 경로를 쓴다', async () => {
    mockRoutes(walkResponse(1500), [transitStep(['A', 'B', 'C', 'D', 'E', 'F', 'G'])]);
    const leg = await getLeg(from, to);
    expect(leg.segments[0]?.mode).toBe('subway');
    expect(leg.warning).toContain('6정거장');
  });

  it('연결 도보 합계가 20분을 넘어도 도보와 대중교통을 함께 유지한다', async () => {
    mockRoutes({ status: 'NO_RESULTS' }, [transitStep(['A', 'B'])]).mockImplementation(async () =>
      apiResponse(walkResponse(601)),
    );
    const leg = await getLeg(demoOrigin, { ...to, lat: 37.56 });
    expect(leg.segments.map((segment) => segment.mode)).toEqual(['walk', 'subway', 'walk']);
    expect(leg.warning).toContain('21분');
  });

  it('연결 도보를 찾지 못하면 조회된 대중교통 선은 남기고 누락을 알린다', async () => {
    mockRoutes({ status: 'NO_RESULTS' }, [transitStep(['A', 'B'])]).mockImplementation(async () =>
      apiResponse({ status: 'NO_RESULTS' }),
    );
    const leg = await getLeg(demoOrigin, { ...to, lat: 37.56 });
    expect(leg.segments.map((segment) => segment.mode)).toEqual(['subway']);
    expect(leg.warning).toContain('일부 연결 도보');
  });

  it('정거장 수를 모르는 경우에도 경로를 유지하고 확인 불가를 알린다', async () => {
    mockRoutes({ status: 'NO_RESULTS' }, [transitStep([])]);
    const leg = await getLeg(from, to);
    expect(leg.segments[0]?.stops).toBeNull();
    expect(leg.segments[0]?.points).toHaveLength(2);
    expect(leg.warning).toContain('정거장 수를 확인하지 못했어요');
  });

  it('실제 경로가 전혀 없을 때는 가짜 직선을 만들지 않는다', async () => {
    mockRoutes({ status: 'NO_RESULTS' }, []);
    const leg = await getLeg(from, to);
    expect(leg.segments).toEqual([]);
    expect(leg.warning).toContain('이동 경로를 찾지 못했어요');
  });
});

const samePointResponse = {
  status: 'SAME_POINT',
  route: { legs: [], properties: { totalDistance: 0, totalTime: 0 } },
};

describe('카카오의 같은 지점 판정', () => {
  it('SAME_POINT의 빈 경로를 형식 오류로 처리하지 않는다', () => {
    expect(walkResponseToSegments(samePointResponse)).toEqual([]);
  });

  it('같은 지점이면 대중교통을 조회하지 않고 위치 확인 안내를 남긴다', async () => {
    vi.stubEnv('KAKAO_REST_API_KEY', 'test-only-key');
    const fetchMock = vi.fn().mockResolvedValue(apiResponse(samePointResponse));
    vi.stubGlobal('fetch', fetchMock);

    const leg = await getLeg(from, { ...to, lat: from.lat + 0.00001, lng: from.lng });

    expect(leg.segments).toEqual([]);
    expect(leg.warning).toContain('같은 지점');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('가깝더라도 카카오가 반환한 정상 도보 경로를 유지한다', async () => {
    vi.stubEnv('KAKAO_REST_API_KEY', 'test-only-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(apiResponse(walkResponse(120))));

    const leg = await getLeg(from, { ...to, lat: from.lat + 0.00001, lng: from.lng });

    expect(leg.segments).toEqual(walkResponseToSegments(walkResponse(120)));
    expect(leg.warning).toBeNull();
  });

  it('연결 도보가 같은 지점으로 판정되면 대중교통 경로를 끊긴 것으로 보지 않는다', async () => {
    mockRoutes({ status: 'NO_RESULTS' }, [transitStep(['A', 'B'])]).mockImplementation(async () =>
      apiResponse(samePointResponse),
    );

    const leg = await getLeg(demoOrigin, { ...to, lat: 37.56 });

    expect(leg.segments.map((segment) => segment.mode)).toEqual(['subway']);
    expect(leg.warning).toBeNull();
  });

  it('복귀 구간이 같은 지점이어도 다른 구간과 방문 순서를 보존한다', async () => {
    vi.stubEnv('DEMO_MODE', 'false');
    vi.stubEnv('KAKAO_REST_API_KEY', 'test-only-key');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(apiResponse(walkResponse(120)))
      .mockResolvedValueOnce(apiResponse(walkResponse(180)))
      .mockResolvedValueOnce(apiResponse(samePointResponse));
    vi.stubGlobal('fetch', fetchMock);
    const nearOrigin = { ...from, id: 'near-origin', lat: from.lat + 0.00001 };

    const plan = await buildTripPlan({
      origin: from,
      places: [to, nearOrigin],
      order: 'manual',
    });

    expect(plan.places.map((place) => place.id)).toEqual([to.id, nearOrigin.id]);
    expect(plan.legs).toHaveLength(3);
    expect(plan.legs.slice(0, 2).every((leg) => leg.segments.length > 0)).toBe(true);
    expect(plan.legs[2]).toMatchObject({ from: nearOrigin, to: from, segments: [] });
    expect(plan.legs[2]?.warning).toContain('같은 지점');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
