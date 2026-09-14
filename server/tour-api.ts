import 'server-only';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { traceProviderCall } from './request-trace';
import { ProviderError } from './provider-error';

const rowSchema = z.record(z.string(), z.union([z.string(), z.number(), z.null()]));
const responseSchema = z.object({
  response: z.object({
    header: z.object({ resultCode: z.string(), resultMsg: z.string().optional() }),
    body: z
      .object({
        totalCount: z.coerce.number().int().nonnegative(),
        items: z
          .union([
            z.literal(''),
            z.object({
              item: z.union([z.array(rowSchema), rowSchema]).optional(),
            }),
          ])
          .nullish(),
      })
      .optional(),
  }),
});
export type TourRow = z.infer<typeof rowSchema>;
interface TourResult {
  rows: TourRow[];
  totalCount: number;
}
// 성공 응답만 보관합니다. 인스턴스마다 최대 500건이며 인증 오류는 재시도할 수 있습니다.
const cache = new Map<string, { until: number; result: TourResult }>();
export async function requestTourApi(
  service: 'KorService2' | 'KorPetTourService2',
  api: string,
  params: Record<string, string>,
): Promise<TourResult> {
  return traceProviderCall('tourapi', `${service}/${api}`, params, async (record) => {
    const key = process.env.TOUR_API_SERVICE_KEY;
    if (!key)
      throw new ProviderError(
        '지금은 행사·반려견 장소 정보를 이용할 수 없어요. 주변 장소는 계속 이용할 수 있어요.',
        503,
      );
    const cacheKey = createHash('sha256')
      .update(JSON.stringify([key, service, api, params]))
      .digest('hex');
    const cached = cache.get(cacheKey);
    if (cached && cached.until > Date.now()) {
      record(200, { cached: true, ...cached.result });
      return cached.result;
    }
    const query = new URLSearchParams({
      ...params,
      MobileOS: 'ETC',
      MobileApp: 'neartrip',
      _type: 'json',
      serviceKey: key,
    });
    let response: Response;
    try {
      response = await fetch(`https://apis.data.go.kr/B551011/${service}/${api}?${query}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new ProviderError('관광정보 응답이 늦어지고 있어요. 잠시 후 다시 시도해주세요.');
    }
    record(response.status, { captured: false });
    const text = await response.text();
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      record(response.status, text);
      throw new ProviderError('관광정보를 불러오지 못했어요. API 인증과 사용 권한을 확인해주세요.');
    }
    record(response.status, raw);
    if (!response.ok)
      throw new ProviderError('관광정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
    const parsed = responseSchema.safeParse(raw);
    if (!parsed.success)
      throw new ProviderError('관광정보 응답 형식이 달라 정보를 표시하지 못했어요.');
    const { header, body } = parsed.data.response;
    if (!['0000', '00'].includes(header.resultCode))
      throw new ProviderError('관광정보를 불러오지 못했어요. API 인증과 사용 한도를 확인해주세요.');
    if (!body) throw new ProviderError('관광정보 응답에 목록이 없어요.');
    const items = body.items ? body.items.item : undefined;
    const result = {
      rows: items ? (Array.isArray(items) ? items : [items]) : [],
      totalCount: body.totalCount,
    };
    for (const [id, value] of cache) if (value.until <= Date.now()) cache.delete(id);
    if (cache.size >= 500) {
      const first = cache.keys().next().value;
      if (first) cache.delete(first);
    }
    cache.set(cacheKey, { result, until: Date.now() + 30 * 60 * 1000 });
    return result;
  });
}
