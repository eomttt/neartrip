import 'server-only';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  crowdingLevelSchema,
  crowdingRequestSchema,
  type Crowding,
  type CrowdingByPlace,
} from '../src/domains/trip/models/model-crowding';
import { isCrowdingFresh } from '../src/domains/trip/utils/crowding-freshness';
import { getTripConfig } from './trip-service';
import { findSeoulArea, type SeoulArea } from './seoul-areas';
import { ProviderError } from './provider-error';
import { recordRequestError, traceProviderCall } from './request-trace';

const populationSchema = z.object({
  'SeoulRtd.citydata_ppltn': z
    .array(
      z.object({
        AREA_CD: z.string(),
        AREA_NM: z.string(),
        AREA_CONGEST_LVL: crowdingLevelSchema,
        PPLTN_TIME: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/),
        REPLACE_YN: z.enum(['Y', 'N']),
      }),
    )
    .min(1),
  RESULT: z.object({ 'RESULT.CODE': z.literal('INFO-000') }),
});
export function populationToCrowding(raw: unknown, area: SeoulArea, now = Date.now()): Crowding {
  const result = populationSchema.safeParse(raw);
  if (!result.success) throw new ProviderError('서울시 혼잡도 응답을 확인할 수 없습니다.');
  const item = result.data['SeoulRtd.citydata_ppltn'].find((row) => row.AREA_CD === area.code);
  if (!item) throw new ProviderError('서울시 혼잡도 응답의 구역이 요청과 다릅니다.');
  const observedAt = z.iso
    .datetime({ offset: true })
    .parse(`${item.PPLTN_TIME.replace(' ', 'T')}:00+09:00`);
  return {
    state: isCrowdingFresh(observedAt, now) ? 'available' : 'stale',
    areaName: area.name,
    level: item.AREA_CONGEST_LVL,
    observedAt,
    replacement: item.REPLACE_YN === 'Y',
    demo: false,
  };
}
const cache = new Map<string, { value: Crowding; expiresAt: number }>();
const pending = new Map<string, Promise<Crowding>>();
async function areaCrowding(area: SeoulArea): Promise<Crowding> {
  const key = process.env.SEOUL_OPEN_API_KEY;
  if (!key) return missingCrowding('not_configured', area.name);
  const cacheKey = createHash('sha256').update(`${key}:${area.code}`).digest('hex');
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now())
    return {
      ...cached.value,
      state:
        cached.value.observedAt && isCrowdingFresh(cached.value.observedAt) ? 'available' : 'stale',
    };
  const existing = pending.get(cacheKey);
  if (existing) return existing;
  const task = traceProviderCall(
    'seoul',
    'citydata_ppltn',
    { areaCode: area.code },
    async (record) => {
      let response: Response;
      try {
        response = await fetch(
          `http://openapi.seoul.go.kr:8088/${encodeURIComponent(key)}/json/citydata_ppltn/1/5/${encodeURIComponent(area.code)}`,
          { cache: 'no-store', signal: AbortSignal.timeout(5000) },
        );
      } catch {
        throw new ProviderError('서울시 혼잡도 조회가 지연되고 있습니다.');
      }
      record(response.status, { captured: false });
      let raw: unknown;
      try {
        raw = await response.json();
      } catch {
        throw new ProviderError('서울시 혼잡도 응답을 읽을 수 없습니다.');
      }
      record(response.status, raw);
      if (!response.ok) throw new ProviderError('서울시 혼잡도를 불러오지 못했습니다.');
      const value = populationToCrowding(raw, area);
      for (const [id, entry] of cache) if (entry.expiresAt <= Date.now()) cache.delete(id);
      if (cache.size >= 121) {
        const first = cache.keys().next().value;
        if (first) cache.delete(first);
      }
      cache.set(cacheKey, { value, expiresAt: Date.now() + 5 * 60_000 });
      return value;
    },
  );
  pending.set(cacheKey, task);
  try {
    return await task;
  } finally {
    pending.delete(cacheKey);
  }
}
export function missingCrowding(
  state: 'unsupported' | 'not_configured' | 'unavailable',
  areaName: string | null = null,
): Crowding {
  return { state, areaName, level: null, observedAt: null, replacement: false, demo: false };
}
export async function findPlaceCrowding(input: unknown): Promise<CrowdingByPlace> {
  const { places } = crowdingRequestSchema.parse(input);
  const matches = places.map((place) => ({ id: place.id, area: findSeoulArea(place) }));
  const areas = Array.from(
    new Map(matches.flatMap(({ area }) => (area ? [[area.code, area]] : []))).values(),
  );
  const byArea = new Map<string, Crowding>();
  for (let i = 0; i < areas.length; i += 3) {
    await Promise.all(
      areas.slice(i, i + 3).map(async (area) => {
        if (getTripConfig().demo) {
          byArea.set(area.code, {
            state: 'available',
            areaName: area.name,
            level: crowdingLevelSchema.options[Number(area.code.slice(3)) % 4] ?? '보통',
            observedAt: new Date().toISOString(),
            replacement: false,
            demo: true,
          });
          return;
        }
        try {
          byArea.set(area.code, await areaCrowding(area));
        } catch (error) {
          recordRequestError(error);
          byArea.set(area.code, missingCrowding('unavailable', area.name));
        }
      }),
    );
  }
  return Object.fromEntries(
    matches.map(({ id, area }) => [
      id,
      area
        ? (byArea.get(area.code) ?? missingCrowding('unavailable', area.name))
        : missingCrowding('unsupported'),
    ]),
  );
}
