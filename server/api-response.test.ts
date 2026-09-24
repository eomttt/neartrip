import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRateLimiter, readPlanBody, respondToApi } from './api-response';
import { ProviderError } from './provider-error';
import { getTripConfig } from './trip-service';

function planRequest(body: string, contentType = 'application/json') {
  return new Request('http://localhost/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body,
  });
}
afterEach(() => vi.unstubAllEnvs());

describe('Route Handler 요청 경계', () => {
  it('분당 60회 이후 요청을 제한하고 다음 구간에 초기화한다', () => {
    const check = createRateLimiter();
    for (let index = 0; index < 60; index += 1) expect(check('a', 0).allowed).toBe(true);
    expect(check('a', 1)).toMatchObject({ allowed: false, remaining: 0 });
    expect(check('b', 1).allowed).toBe(true);
    expect(check('a', 60_000)).toMatchObject({ allowed: true, remaining: 59 });
  });
  it('JSON 요청을 읽고 응답 캐시를 막는다', async () => {
    const request = planRequest('{"name":"성수역"}');
    const response = await respondToApi(request, () => readPlanBody(request));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ name: '성수역' });
  });
  it.each([
    ['{broken', 'application/json', 400],
    ['{}', 'text/plain', 415],
    [JSON.stringify({ text: '가'.repeat(7_000) }), 'application/json', 413],
  ])('잘못된 형식과 20KB 초과 본문을 거부한다', async (body, contentType, status) => {
    const request = planRequest(body, contentType);
    const response = await respondToApi(request, () => readPlanBody(request));
    expect(response.status).toBe(status);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('공급자의 인증 오류 상태를 유지한다', async () => {
    const response = await respondToApi(planRequest('{}'), () => {
      throw new ProviderError('인증 설정을 확인해주세요.', 401);
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: '인증 설정을 확인해주세요.',
      traceId: response.headers.get('x-trace-id'),
    });
  });
  it('예상하지 못한 오류의 내부 내용을 노출하지 않는다', async () => {
    const response = await respondToApi(planRequest('{}'), () => {
      throw new Error('private implementation detail');
    });
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('private implementation detail');
  });
  it('Google 공개 키와 서버 키가 모두 있어야 설정 완료이며 키 값은 반환하지 않는다', () => {
    vi.stubEnv('DEMO_MODE', 'false');
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-server-value');
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'test-browser-value');
    expect(getTripConfig()).toMatchObject({ configured: true, demo: false });
    expect(JSON.stringify(getTripConfig())).not.toContain('test-');
  });
  it('키가 하나만 있으면 예시 모드로 숨기지 않는다', () => {
    vi.stubEnv('DEMO_MODE', 'false');
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-server-value');
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', '');
    expect(getTripConfig()).toMatchObject({ configured: false, demo: false });
  });
});
