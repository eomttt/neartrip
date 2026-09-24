import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { areaContains, findSeoulArea, seoulAreas, type SeoulArea } from './seoul-areas';
import { findPlaceCrowding, populationToCrowding } from './seoul-crowding';
import { respondToApi } from './api-response';
import { isCrowdingFresh } from '../src/domains/trip/utils/crowding-freshness';
let keyIndex = 0;
const now = new Date('2026-09-11T04:00:00Z');
const point = { id: 'cafe', lat: 37.5435, lng: 127.0529 };
function areaFor(code: string) {
  const area = seoulAreas.find((item) => item.code === code);
  if (!area) throw new Error('구역 없음');
  return area;
}
const seongsu = areaFor('POI068');
function response(area = seongsu, extra = {}) {
  return {
    'SeoulRtd.citydata_ppltn': [
      {
        AREA_CD: area.code,
        AREA_NM: area.name,
        AREA_CONGEST_LVL: '여유',
        PPLTN_TIME: '2026-09-11 12:55',
        REPLACE_YN: 'N',
        ...extra,
      },
    ],
    RESULT: { 'RESULT.CODE': 'INFO-000', 'RESULT.MESSAGE': '정상 처리되었습니다.' },
  };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.stubEnv('DEMO_MODE', 'false');
  vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-places');
  vi.stubEnv('SEOUL_OPEN_API_KEY', `private-seoul-key-${++keyIndex}`);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('서울시 제공 구역 판별', () => {
  it('121개 공식 구역 중 실제로 포함되는 장소만 연결한다', () => {
    expect(seoulAreas).toHaveLength(121);
    expect(findSeoulArea(point)?.code).toBe('POI068');
    expect(findSeoulArea({ lat: 35.16, lng: 129.16 })).toBeUndefined();
    expect(findSeoulArea({ lat: 37.5, lng: 127.08 })).toBeUndefined();
  });
  it('경계와 내부 구멍을 구분하고 분리된 다각형도 판별한다', () => {
    const area: SeoulArea = {
      code: 'test',
      name: 'test',
      bbox: [0, 0, 10, 10],
      polygons: [
        [
          [
            [0, 0],
            [6, 0],
            [6, 6],
            [0, 6],
            [0, 0],
          ],
          [
            [2, 2],
            [4, 2],
            [4, 4],
            [2, 4],
            [2, 2],
          ],
        ],
        [
          [
            [8, 8],
            [10, 8],
            [10, 10],
            [8, 10],
            [8, 8],
          ],
        ],
      ],
    };
    expect(areaContains(area, { lng: 0, lat: 3 })).toBe(true);
    expect(areaContains(area, { lng: 1, lat: 1 })).toBe(true);
    expect(areaContains(area, { lng: 3, lat: 3 })).toBe(false);
    expect(areaContains(area, { lng: 2, lat: 3 })).toBe(false);
    expect(areaContains(area, { lng: 7, lat: 7 })).toBe(false);
    expect(areaContains(area, { lng: 9, lat: 9 })).toBe(true);
  });
});

describe('혼잡도 조회와 실패 격리', () => {
  it('실제 서울시 JSON 구조와 한국 시각을 변환한다', () => {
    expect(populationToCrowding(response(), seongsu, now.getTime())).toMatchObject({
      state: 'available',
      level: '여유',
      areaName: '성수카페거리',
      observedAt: '2026-09-11T12:55:00+09:00',
    });
    expect(
      populationToCrowding(response(seongsu, { REPLACE_YN: 'Y' }), seongsu, now.getTime())
        .replacement,
    ).toBe(true);
  });
  it('오래된 데이터와 과도한 미래 시각을 현재 혼잡도로 표시하지 않는다', () => {
    expect(
      populationToCrowding(
        response(seongsu, { PPLTN_TIME: '2026-09-11 12:00' }),
        seongsu,
        now.getTime(),
      ).state,
    ).toBe('stale');
    expect(isCrowdingFresh('2026-09-11T12:40:00+09:00', now.getTime())).toBe(true);
    expect(isCrowdingFresh('2026-09-11T12:39:59+09:00', now.getTime())).toBe(false);
    expect(isCrowdingFresh('2026-09-11T14:00:00+09:00', now.getTime())).toBe(false);
  });
  it('다른 구역·알 수 없는 등급·오류 응답을 성공으로 해석하지 않는다', () => {
    expect(() => populationToCrowding(response(seongsu, { AREA_CD: 'POI009' }), seongsu)).toThrow();
    expect(() =>
      populationToCrowding(response(seongsu, { AREA_CONGEST_LVL: '점검 중' }), seongsu),
    ).toThrow();
    expect(() =>
      populationToCrowding({ RESULT: { 'RESULT.CODE': 'ERROR-300' } }, seongsu),
    ).toThrow();
  });
  it('같은 구역은 한 번 조회하고 성공 결과를 재사용하며 미지원 지역은 요청하지 않는다', async () => {
    const fetcher = vi.fn(async () => Response.json(response()));
    vi.stubGlobal('fetch', fetcher);
    const input = {
      places: [
        point,
        { ...point, id: 'cafe-2', lat: 37.5436 },
        { id: 'busan', lat: 35.16, lng: 129.16 },
      ],
    };
    const result = await findPlaceCrowding(input);
    expect(result.cafe?.level).toBe('여유');
    expect(result['cafe-2']).toEqual(result.cafe);
    expect(result.busan?.state).toBe('unsupported');
    await findPlaceCrowding(input);
    expect(fetcher).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date(now.getTime() + 301_000));
    await findPlaceCrowding(input);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('동시 요청도 같은 구역의 진행 중 조회를 재사용한다', async () => {
    const fetcher = vi.fn(async () => Response.json(response()));
    vi.stubGlobal('fetch', fetcher);
    const result = await Promise.all([
      findPlaceCrowding({ places: [point] }),
      findPlaceCrowding({ places: [{ ...point, id: 'second' }] }),
    ]);
    expect(result[0]?.cafe?.level).toBe('여유');
    expect(result[1]?.second?.level).toBe('여유');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('키 미설정을 데이터 없음과 구분하고 예시 혼잡도를 실제 값으로 반환하지 않는다', async () => {
    vi.stubEnv('SEOUL_OPEN_API_KEY', '');
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    expect((await findPlaceCrowding({ places: [point] })).cafe).toMatchObject({
      state: 'not_configured',
      areaName: '성수카페거리',
      level: null,
      demo: false,
    });
    expect(fetcher).not.toHaveBeenCalled();
    vi.stubEnv('DEMO_MODE', 'true');
    expect((await findPlaceCrowding({ places: [point] })).cafe?.demo).toBe(true);
  });
  it('일부 구역 조회가 실패해도 다른 구역 결과를 반환하고 원인을 추적한다', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const parkPoint = { id: 'park', lat: 37.5445, lng: 127.0375 };
    const park = findSeoulArea(parkPoint);
    if (!park) throw new Error('공원 구역 없음');
    const fetcher = vi.fn(async (input: string | URL | Request) =>
      String(input).endsWith(seongsu.code)
        ? Response.json({
            RESULT: { 'RESULT.CODE': 'ERROR-300', key: process.env.SEOUL_OPEN_API_KEY },
          })
        : Response.json(response(park)),
    );
    vi.stubGlobal('fetch', fetcher);
    const res = await respondToApi(
      new Request('https://neartrip.example/api/crowding', { method: 'POST' }),
      () => findPlaceCrowding({ places: [point, parkPoint] }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      cafe: { state: 'unavailable' },
      park: { state: 'available' },
    });
    const first: unknown = log.mock.calls[0]?.[0];
    if (typeof first !== 'string') throw new Error('로그 없음');
    expect(
      z
        .object({ event: z.literal('api_partial_failure'), seoul: z.array(z.unknown()) })
        .parse(JSON.parse(first)).seoul,
    ).toHaveLength(2);
    expect(first).not.toContain(process.env.SEOUL_OPEN_API_KEY);
    await findPlaceCrowding({ places: [point] });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
