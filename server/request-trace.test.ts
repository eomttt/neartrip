import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { readPlanBody, respondToApi } from './api-response';
import { buildTripPlan } from './trip-service';
import { demoOrigin } from './demo';
import { traceKakaoCall, withTraceLeg } from './request-trace';

const logs = z.object({
  traceId: z.string().uuid(),
  event: z.string(),
  request: z.object({ body: z.unknown() }).optional(),
  response: z.object({ error: z.string(), traceId: z.string() }).optional(),
  error: z.unknown().optional(),
  kakao: z
    .array(
      z.object({
        leg: z.number().nullable(),
        api: z.string(),
        body: z.unknown(),
        error: z.unknown().optional(),
      }),
    )
    .optional(),
});
const errorLog = vi.fn();
const infoLog = vi.fn();

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(errorLog);
  vi.spyOn(console, 'info').mockImplementation(infoLog);
  vi.stubEnv('DEMO_MODE', 'false');
  vi.stubEnv('KAKAO_REST_API_KEY', 'private-kakao-key-for-test');
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  errorLog.mockReset();
  infoLog.mockReset();
});

function request(body: unknown) {
  return new Request('https://neartrip.example/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer private-request-header' },
    body: JSON.stringify(body),
  });
}
function parseLog(index = 0) {
  const entry: unknown = errorLog.mock.calls[index]?.[0];
  if (typeof entry !== 'string') throw new Error('실패 로그가 없습니다.');
  return logs.parse(JSON.parse(entry));
}

describe('요청별 오류 추적', () => {
  it('빈 카카오 경로의 본문과 검증 위치를 실패 구간 및 응답 ID에 연결한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ status: 'OK', route: { legs: [] }, token: 'provider-secret' }),
      ),
    );
    const body = {
      origin: demoOrigin,
      destination: { ...demoOrigin, id: 'end', lat: 37.55 },
      places: [],
      order: 'manual',
      apiKey: 'request-secret',
    };
    const input = request(body);
    const response = await respondToApi(input, async () =>
      buildTripPlan(await readPlanBody(input)),
    );
    const log = parseLog();
    expect(response.status).toBe(400);
    expect(log.traceId).toBe(response.headers.get('x-trace-id'));
    expect(log.response).toEqual(await response.json());
    expect(log.request?.body).toMatchObject({
      origin: { id: demoOrigin.id },
      apiKey: '[REDACTED]',
    });
    expect(log.kakao?.[0]).toMatchObject({
      leg: 1,
      api: '/v2/routing/walk',
      body: { status: 'OK', route: { legs: [] } },
      error: { name: 'ZodError', issues: [{ path: ['route', 'legs'], code: 'too_small' }] },
    });
    expect(JSON.stringify(errorLog.mock.calls)).not.toMatch(
      /provider-secret|request-secret|private-kakao-key-for-test|private-request-header/,
    );
  });

  it('정상 요청에는 본문과 공급자 응답을 출력하지 않는다', async () => {
    const input = request({ name: '숙소 이름' });
    const response = await respondToApi(input, async () => {
      await readPlanBody(input);
      return traceKakaoCall('/test', {}, async (record) => {
        record(200, { data: 'provider-body' });
        return { secret: 'response-body' };
      });
    });
    expect(response.status).toBe(200);
    expect(errorLog).not.toHaveBeenCalled();
    expect(JSON.stringify(infoLog.mock.calls)).not.toMatch(/숙소 이름|provider-body|response-body/);
    expect(infoLog).toHaveBeenCalledWith(
      expect.stringContaining(response.headers.get('x-trace-id') ?? 'missing'),
    );
  });

  it('동시에 실행되는 요청과 구간의 진단 정보가 서로 섞이지 않는다', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    async function fail(name: string, leg: number, pause: boolean) {
      const input = request({ name });
      return respondToApi(input, async () => {
        await readPlanBody(input);
        return withTraceLeg(leg, () =>
          traceKakaoCall(`/test/${name}`, {}, async (record) => {
            if (pause) await gate;
            record(200, { name });
            throw new Error(`failure-${name}`);
          }),
        );
      });
    }
    const first = fail('first', 1, true);
    const second = await fail('second', 2, false);
    release();
    const firstResponse = await first;
    expect(firstResponse.headers.get('x-trace-id')).not.toBe(second.headers.get('x-trace-id'));
    expect(parseLog(0)).toMatchObject({
      traceId: second.headers.get('x-trace-id'),
      request: { body: { name: 'second' } },
      kakao: [{ leg: 2, body: { name: 'second' } }],
    });
    expect(parseLog(1)).toMatchObject({
      traceId: firstResponse.headers.get('x-trace-id'),
      request: { body: { name: 'first' } },
      kakao: [{ leg: 1, body: { name: 'first' } }],
    });
  });

  it('긴 좌표는 개수와 표본을 남기고 중첩 인증 정보와 환경변수 값은 가린다', async () => {
    const input = request({ nested: { password: 'password-value' } });
    await respondToApi(input, async () => {
      await readPlanBody(input);
      return traceKakaoCall('/test', { api_key: 'query-key' }, async (record) => {
        record(200, {
          path: { points: Array.from({ length: 10_000 }, (_, i) => [127, 37 + i / 100_000]) },
          note: 'private-kakao-key-for-test',
          headers: { cookie: 'cookie-value' },
        });
        throw new Error('private-kakao-key-for-test');
      });
    });
    expect(parseLog().kakao?.[0]?.body).toMatchObject({
      path: {
        points: {
          length: 10_000,
          truncated: true,
          first: expect.any(Array),
          last: expect.any(Array),
        },
      },
      note: '[REDACTED]',
      headers: '[REDACTED]',
    });
    expect(JSON.stringify(errorLog.mock.calls)).not.toMatch(
      /password-value|query-key|private-kakao-key-for-test|cookie-value/,
    );
  });

  it('본문과 호출 내역이 커져도 실패 로그는 제한된 크기의 유효한 JSON이다', async () => {
    const input = request({ content: Array.from({ length: 20 }, () => '가'.repeat(500)) });
    await respondToApi(input, async () => {
      for (let i = 0; i < 40; i += 1) {
        await traceKakaoCall('/test', {}, async (record) => {
          record(200, { content: Array.from({ length: 20 }, () => '가'.repeat(500)) });
        });
      }
      throw new Error('failed');
    });
    const raw: unknown = errorLog.mock.calls[0]?.[0];
    if (typeof raw !== 'string') throw new Error('로그 없음');
    expect(Buffer.byteLength(raw)).toBeLessThan(80_000);
    expect(
      z.object({ omittedCalls: z.number().positive() }).parse(JSON.parse(raw)).omittedCalls,
    ).toBeGreaterThan(0);
  });

  it('깨진 JSON 본문은 원문을 남기지 않고 읽기 실패만 기록한다', async () => {
    const input = new Request('https://neartrip.example/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'do-not-log is not JSON',
    });
    const response = await respondToApi(input, () => readPlanBody(input));
    expect(response.status).toBe(400);
    expect(parseLog().request?.body).toMatchObject({ captured: false, reason: 'invalid_json' });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('do-not-log');
  });
});
