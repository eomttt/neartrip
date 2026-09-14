import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { discoverTripPlaces, isFestivalInRange } from './discovery-service';
import { requestTourApi } from './tour-api';
import { respondToApi } from './api-response';
import { koreaDate, koreaWeekRange } from '../src/domains/trip/utils/korea-date';
import { planRequestSchema } from '../src/domains/trip/models/model-trip';
import { demoOrigin } from './demo';
let keyIndex = 0;
beforeEach(() => {
  vi.stubEnv('DEMO_MODE', 'false');
  vi.stubEnv('KAKAO_REST_API_KEY', 'test-kakao');
  vi.stubEnv('TOUR_API_SERVICE_KEY', `private-tour/test+key=${++keyIndex}`);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const now = new Date('2026-09-11T02:00:00Z');
const params = (mode = 'festival', page = 1) =>
  new URLSearchParams({
    mode,
    lat: '37.5445',
    lng: '127.0558',
    radius: '1000',
    page: String(page),
  });
const row = (id: string, extra = {}) => ({
  contentid: id,
  contenttypeid: '15',
  title: `행사 ${id}`,
  mapx: '127.056',
  mapy: '37.545',
  addr1: '서울 성동구',
  ...extra,
});
function ok(rows: unknown, totalCount = 1) {
  return Response.json({
    response: { header: { resultCode: '0000' }, body: { items: { item: rows }, totalCount } },
  });
}
function mockData(
  rows: ReturnType<typeof row>[],
  details: Record<string, unknown>,
  totalCount = rows.length,
  festivalRows: ReturnType<typeof row>[] = [],
) {
  const fetcher = vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('locationBasedList2')) return ok(rows, totalCount);
    if (url.pathname.endsWith('searchFestival2')) return ok(festivalRows, festivalRows.length);
    return ok(details[url.searchParams.get('contentId') ?? ''] ?? [], 1);
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}
describe('이번 주 행사와 반려견 장소', () => {
  it('서버 지역과 무관하게 한국 자정을 기준으로 오늘을 계산한다', () => {
    expect(koreaDate(new Date('2026-09-10T14:59:59Z'))).toBe('20260910');
    expect(koreaDate(new Date('2026-09-10T15:00:00Z'))).toBe('20260911');
  });
  it.each([
    ['2026-09-11T02:00:00Z', '20260911', '20260913'],
    ['2026-09-13T14:59:59Z', '20260913', '20260913'],
    ['2026-09-13T15:00:00Z', '20260914', '20260920'],
    ['2026-09-30T15:00:00Z', '20261001', '20261004'],
    ['2026-12-31T15:00:00Z', '20270101', '20270103'],
  ])('한국 시간의 일요일까지 조회하고 월요일에 범위를 바꾼다: %s', (instant, start, end) => {
    expect(koreaWeekRange(new Date(instant))).toEqual({ start, end });
  });
  it('진행 중인 행사와 마지막 날을 포함하고 종료·다음 주·취소 행사는 제외한다', () => {
    const dates: [string, string, boolean][] = [
      ['20260801', '20260912', true],
      ['20260911', '20260911', true],
      ['20260912', '20260913', true],
      ['20260913', '20260913', true],
      ['20260914', '20260930', false],
      ['20260913', '20260912', false],
      ['20260101', '20260910', false],
      ['', '', false],
    ];
    for (const [start, end, expected] of dates) {
      expect(
        isFestivalInRange({ eventstartdate: start, eventenddate: end }, '20260911', '20260913'),
      ).toBe(expected);
    }
    expect(
      isFestivalInRange(
        { eventstartdate: '20260901', eventenddate: '20260930', progresstype: '취소' },
        '20260911',
        '20260913',
      ),
    ).toBe(false);
  });
  it('위치와 개최 기간을 확인하고 진행 중인 행사를 일반 동선에 담는다', async () => {
    const fetcher = mockData([row('1'), row('2'), row('3', { mapx: '0', mapy: '0' })], {
      '1': [{ eventstartdate: '20260801', eventenddate: '20260930', playtime: '10:00<br>18:00' }],
      '2': [{ eventstartdate: '20260912', eventenddate: '20260930' }],
    });
    const result = await discoverTripPlaces(params(), now);
    expect(result.places).toHaveLength(2);
    expect(result.places[0]).toMatchObject({
      id: 'tourapi:1',
      lat: 37.545,
      lng: 127.056,
      tourism: { period: '20260801 ~ 20260930', conditions: '10:00 18:00' },
    });
    expect(
      planRequestSchema.safeParse({ origin: demoOrigin, places: result.places, order: 'manual' })
        .success,
    ).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('첫 후보에 이번 주 행사가 없어도 다음 페이지를 제공한다', async () => {
    const fetcher = mockData(
      [row('1')],
      { '1': [{ eventstartdate: '20260101', eventenddate: '20260901' }] },
      25,
    );
    const result = await discoverTripPlaces(params(), now);
    expect(result.places).toEqual([]);
    expect(result.nextPage).toBe(2);
    await discoverTripPlaces(params('festival', 2), now);
    expect(
      fetcher.mock.calls.some(
        ([input]) => new URL(String(input)).searchParams.get('pageNo') === '2',
      ),
    ).toBe(true);
  });
  it('선택한 반경에 행사가 없으면 이번 주 전국 행사 중 가까운 장소를 추천한다', async () => {
    const distantFestival = row('9', {
      title: '한강 주말 축제',
      mapx: '126.975',
      mapy: '37.565',
      addr1: '서울 종로구',
      eventstartdate: '20260901',
      eventenddate: '20260913',
    });
    const fetcher = mockData([], {}, 0, [
      row('10', {
        title: '부산 축제',
        mapx: '129.075',
        mapy: '35.18',
        eventstartdate: '20260901',
        eventenddate: '20260913',
      }),
      distantFestival,
    ]);

    const result = await discoverTripPlaces(params(), now);

    expect(result.places).toEqual([]);
    expect(result.recommendations).toHaveLength(2);
    expect(result.recommendations[0]).toMatchObject({
      id: 'tourapi:9',
      name: '한강 주말 축제',
      tourism: { kind: 'festival', period: '20260901 ~ 20260913' },
    });
    expect(fetcher.mock.calls.some(([input]) => String(input).includes('/searchFestival2'))).toBe(
      true,
    );
  });
  it('위치 기반 목록이 놓친 반경 내 행사는 추천이 아닌 결과로 보여준다', async () => {
    const nearbyFestival = row('11', {
      title: '성수 주말 전시',
      mapx: '127.056',
      mapy: '37.545',
      eventstartdate: '20260901',
      eventenddate: '20260913',
    });
    mockData([], {}, 0, [nearbyFestival]);

    const result = await discoverTripPlaces(params(), now);

    expect(result.places).toHaveLength(1);
    expect(result.places[0]?.name).toBe('성수 주말 전시');
    expect(result.recommendations).toEqual([]);
  });
  it('반려동물 전용 목록을 쓰고 조건을 남기며 동반 불가와 고양이 전용은 제외한다', async () => {
    const fetcher = mockData([row('1', { contenttypeid: '39' }), row('2'), row('3')], {
      '1': [{ acmpyPsblCpam: '소형견', acmpyNeedMtr: '목줄 착용', etcAcmpyInfo: '야외만 가능' }],
      '2': [{ acmpyPsblCpam: '반려견 동반 불가' }],
      '3': [{ acmpyPsblCpam: '고양이만' }],
    });
    const result = await discoverTripPlaces(params('pet'), now);
    expect(result.places).toHaveLength(1);
    expect(result.places[0]).toMatchObject({
      category: 'restaurant',
      tourism: { kind: 'pet', conditions: '소형견 · 목줄 착용 · 야외만 가능' },
    });
    expect(
      fetcher.mock.calls.every(([input]) => String(input).includes('/KorPetTourService2/')),
    ).toBe(true);
  });
  it('빈 XML형 JSON 목록과 단일 item 응답을 처리하고 성공 응답을 재사용한다', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          response: { header: { resultCode: '0000' }, body: { totalCount: 0, items: '' } },
        }),
      )
      .mockResolvedValueOnce(ok(row('1')));
    vi.stubGlobal('fetch', fetcher);
    expect((await requestTourApi('KorService2', 'empty', {})).rows).toEqual([]);
    expect((await requestTourApi('KorService2', 'single', {})).rows).toHaveLength(1);
    await requestTourApi('KorService2', 'single', {});
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('HTTP 200 인증 오류도 실패로 기록하고 키를 숨기며 실패는 캐시하지 않는다', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetcher = vi.fn(async () =>
      Response.json({
        response: {
          header: {
            resultCode: '30',
            resultMsg: `denied ${encodeURIComponent(process.env.TOUR_API_SERVICE_KEY ?? '')}`,
          },
          serviceKey: 'unrelated-secret',
        },
      }),
    );
    vi.stubGlobal('fetch', fetcher);
    const req = new Request('https://neartrip.example/api/discover');
    const response = await respondToApi(req, () => requestTourApi('KorService2', 'test', {}));
    expect(response.status).toBe(502);
    expect(JSON.stringify(log.mock.calls)).toContain('tourapi');
    expect(JSON.stringify(log.mock.calls)).not.toContain(process.env.TOUR_API_SERVICE_KEY);
    expect(JSON.stringify(log.mock.calls)).not.toContain('unrelated-secret');
    expect(JSON.stringify(log.mock.calls)).not.toContain(
      encodeURIComponent(process.env.TOUR_API_SERVICE_KEY ?? ''),
    );
    await expect(requestTourApi('KorService2', 'test', {})).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('실제 모드에서 키가 없으면 이용 불가 안내를 반환하고 외부 요청을 보내지 않는다', async () => {
    vi.stubEnv('TOUR_API_SERVICE_KEY', '');
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    await expect(discoverTripPlaces(params(), now)).rejects.toThrow(
      '지금은 행사·반려견 장소 정보를 이용할 수 없어요.',
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('예시 모드는 인증 없이 두 종류의 장소와 날짜를 표시한다', async () => {
    vi.stubEnv('DEMO_MODE', 'true');
    vi.stubEnv('TOUR_API_SERVICE_KEY', '');
    const query = params();
    query.set('lat', String(demoOrigin.lat));
    query.set('lng', String(demoOrigin.lng));
    query.set('radius', '20000');
    const result = await discoverTripPlaces(query, now);
    expect(result.places.length).toBeGreaterThan(0);
    expect(result.places.every((place) => place.name.includes('예시'))).toBe(true);
    query.set('mode', 'pet');
    expect(
      (await discoverTripPlaces(query, now)).places.every((place) => place.tourism?.kind === 'pet'),
    ).toBe(true);
  });
});
