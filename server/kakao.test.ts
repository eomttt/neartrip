import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getLeg,
  isShortTransit,
  transitResponseToCandidates,
  walkResponseToSegments,
} from './kakao';
import type { Segment } from '../src/domains/trip/models/model-trip';
import { demoOrigin } from './demo';

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

describe('카카오 실응답에서 확인한 대중교통 경계', () => {
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
