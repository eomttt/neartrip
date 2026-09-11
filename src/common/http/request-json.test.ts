import { afterEach, expect, it, vi } from 'vitest';
import { requestJson } from './request-json';

afterEach(() => vi.unstubAllGlobals());

it('서버 추적 ID를 사용자 오류 메시지에 포함한다', async () => {
  const traceId = '12345678-1234-4234-8234-123456789012';
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ error: '경로 오류', traceId }, { status: 400 })),
  );
  await expect(requestJson('/api/plan')).rejects.toThrow(`경로 오류 추적 ID: ${traceId}`);
});

it('추적 ID가 없는 기존 오류도 표시한다', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ error: '경로 오류' }, { status: 400 })),
  );
  await expect(requestJson('/api/plan')).rejects.toThrow('경로 오류');
});
