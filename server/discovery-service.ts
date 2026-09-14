import 'server-only';
import { z } from 'zod';
import { placeSchema, type Place } from '../src/domains/trip/models/model-trip';
import { distanceMeters } from '../src/domains/trip/utils/route-order';
import { koreaWeekRange } from '../src/domains/trip/utils/korea-date';
import type { DiscoveryResult } from '../src/domains/trip/models/model-discovery';
import { getTripConfig } from './trip-service';
import { demoPlaces } from './demo';
import { requestTourApi, type TourRow } from './tour-api';

const querySchema = z.object({
  mode: z.enum(['festival', 'pet']),
  lat: z.coerce.number().min(32).max(39.5),
  lng: z.coerce.number().min(124).max(132),
  radius: z.coerce.number().int().min(300).max(20000),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});
const PAGE_SIZE = 10;
function text(value: unknown): string {
  return typeof value === 'string'
    ? value
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim()
    : '';
}
export function isFestivalInRange(row: TourRow, from: string, through: string): boolean {
  const start = text(row.eventstartdate);
  const end = text(row.eventenddate);
  return (
    /^\d{8}$/.test(start) &&
    /^\d{8}$/.test(end) &&
    start <= end &&
    start <= through &&
    from <= end &&
    !/취소|연기|온라인/.test(
      `${text(row.title)} ${text(row.progresstype)} ${text(row.festivaltype)}`,
    )
  );
}
function basePlace(row: TourRow): Place | null {
  const id = text(row.contentid);
  if (!/^\d+$/.test(id)) return null;
  const parsed = placeSchema.safeParse({
    id: `tourapi:${id}`,
    name: text(row.title).slice(0, 120),
    address: [text(row.addr1), text(row.addr2)].filter(Boolean).join(' ').slice(0, 250),
    category: row.contenttypeid === '39' ? 'restaurant' : 'attraction',
    lat: Number(row.mapy),
    lng: Number(row.mapx),
    description: '',
    url: '',
  });
  return parsed.success ? parsed.data : null;
}
function festivalPlace(place: Place, row: TourRow): Place {
  return {
    ...place,
    description: '이번 주 일요일까지 열리는 행사예요. 운영 시간은 방문 전에 확인해주세요.',
    tourism: {
      kind: 'festival',
      period: `${text(row.eventstartdate)} ~ ${text(row.eventenddate)}`,
      conditions: text(row.playtime).slice(0, 1200) || undefined,
    },
  };
}
async function searchCurrentFestivals(
  query: z.infer<typeof querySchema>,
  date: string,
  endDate: string,
): Promise<Place[]> {
  const result = await requestTourApi('KorService2', 'searchFestival2', {
    eventStartDate: date,
    eventEndDate: endDate,
    arrange: 'A',
    pageNo: '1',
    numOfRows: '100',
  });
  return result.rows
    .flatMap((row) => {
      const place = basePlace(row);
      return place && isFestivalInRange(row, date, endDate) ? [festivalPlace(place, row)] : [];
    })
    .toSorted((a, b) => distanceMeters(query, a) - distanceMeters(query, b));
}
export function petConditions(row: TourRow): string {
  return [text(row.acmpyPsblCpam), text(row.acmpyNeedMtr), text(row.etcAcmpyInfo)]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 1200);
}
export async function discoverTripPlaces(
  params: URLSearchParams,
  now = new Date(),
): Promise<DiscoveryResult> {
  const query = querySchema.parse(Object.fromEntries(params));
  const { start: date, end: endDate } = koreaWeekRange(now);
  if (getTripConfig().demo) {
    const places = demoPlaces
      .slice(query.mode === 'festival' ? 0 : 2, query.mode === 'festival' ? 2 : 4)
      .filter((place) => distanceMeters(query, place) <= query.radius)
      .map((place): Place => ({
        ...place,
        id: `demo-${query.mode}-${place.id}`,
        name:
          query.mode === 'festival'
            ? `${place.name} 동네 행사 예시`
            : `${place.name} 반려견 동반 예시`,
        description: '실제 관광정보가 아닌 예시 장소입니다.',
        tourism:
          query.mode === 'festival'
            ? { kind: 'festival', period: `${date} ~ ${endDate}` }
            : { kind: 'pet', conditions: '목줄 착용 · 야외 좌석 동반 가능 — 예시 조건' },
      }));
    return {
      places: query.page === 1 ? places : [],
      recommendations: [],
      nextPage: null,
      date,
    };
  }
  const service = query.mode === 'pet' ? 'KorPetTourService2' : 'KorService2';
  const location = await requestTourApi(service, 'locationBasedList2', {
    mapX: String(query.lng),
    mapY: String(query.lat),
    radius: String(query.radius),
    arrange: 'E',
    pageNo: String(query.page),
    numOfRows: String(PAGE_SIZE),
    ...(query.mode === 'festival' ? { contentTypeId: '15' } : {}),
  });
  const places: Place[] = [];
  // 상세 조회를 세 건씩 나눠 호출합니다. 다음 페이지는 사용자가 더 찾을 때 조회합니다.
  for (let i = 0; i < location.rows.length; i += 3) {
    const batch = await Promise.all(
      location.rows.slice(i, i + 3).map(async (row): Promise<Place | null> => {
        const place = basePlace(row);
        if (!place || distanceMeters(query, place) > query.radius) return null;
        const details = await requestTourApi(
          service,
          query.mode === 'festival' ? 'detailIntro2' : 'detailPetTour2',
          {
            contentId: text(row.contentid),
            numOfRows: '1',
            pageNo: '1',
            ...(query.mode === 'festival' ? { contentTypeId: '15' } : {}),
          },
        );
        const detail = details.rows[0] ?? {};
        if (query.mode === 'festival') {
          if (!isFestivalInRange({ ...row, ...detail }, date, endDate)) return null;
          return festivalPlace(place, detail);
        }
        const animals = text(detail.acmpyPsblCpam);
        if (
          /동반\s*(불가|불가능|금지)|출입\s*(불가|금지)/.test(animals) ||
          (/고양이/.test(animals) && !/강아지|반려견|소형견|중형견|대형견|모든/.test(animals))
        )
          return null;
        return {
          ...place,
          description:
            '반려동물 동반 여행지예요. 반려견 크기와 입장 조건을 방문 전에 확인해주세요.',
          tourism: {
            kind: 'pet',
            conditions: petConditions(detail) || '상세 동반 조건은 시설에 문의해주세요.',
          },
        };
      }),
    );
    for (const place of batch)
      if (place && !places.some((item) => item.id === place.id)) places.push(place);
  }
  const festivalFallbacks =
    query.mode === 'festival' && query.page === 1 && places.length === 0
      ? await searchCurrentFestivals(query, date, endDate)
      : [];
  const fallbackPlaces = festivalFallbacks
    .filter((place) => distanceMeters(query, place) <= query.radius)
    .slice(0, PAGE_SIZE);
  return {
    places: places.length > 0 ? places : fallbackPlaces,
    recommendations:
      fallbackPlaces.length === 0
        ? festivalFallbacks
            .filter((place) => distanceMeters(query, place) > query.radius)
            .slice(0, 3)
        : [],
    date,
    nextPage:
      query.page * PAGE_SIZE < location.totalCount && location.rows.length > 0 && query.page < 1000
        ? query.page + 1
        : null,
  };
}
