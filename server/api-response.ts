import 'server-only';
import { z } from 'zod';
import { ProviderError } from './kakao';

class RequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function createRateLimiter() {
  const clients = new Map<string, { count: number; resetAt: number }>();
  return (key: string, now = Date.now()) => {
    for (const [client, entry] of clients) if (entry.resetAt <= now) clients.delete(client);
    const entry = clients.get(key) ?? { count: 0, resetAt: now + 60_000 };
    entry.count += 1;
    clients.set(key, entry);
    return {
      allowed: entry.count <= 60,
      remaining: Math.max(0, 60 - entry.count),
      reset: Math.ceil((entry.resetAt - now) / 1_000),
    };
  };
}
const checkRate = createRateLimiter();

export async function respondToApi(request: Request, action: () => unknown | Promise<unknown>) {
  // Vercel이 덮어쓰는 헤더만 신뢰하며 로컬 실행은 하나의 클라이언트로 집계합니다.
  const key =
    process.env.VERCEL === '1' ? (request.headers.get('x-forwarded-for') ?? 'unknown') : 'local';
  const rate = checkRate(key);
  const headers = {
    'Cache-Control': 'no-store',
    'RateLimit-Policy': '60;w=60',
    RateLimit: `limit=60, remaining=${rate.remaining}, reset=${rate.reset}`,
  };
  if (!rate.allowed)
    return Response.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: { ...headers, 'Retry-After': String(rate.reset) } },
    );
  try {
    return Response.json(await action(), { headers });
  } catch (error) {
    if (error instanceof z.ZodError)
      return Response.json(
        { error: '요청 또는 지도 응답의 형식이 올바르지 않습니다.' },
        { status: 400, headers },
      );
    if (error instanceof ProviderError || error instanceof RequestError)
      return Response.json({ error: error.message }, { status: error.status, headers });
    if (error instanceof SyntaxError)
      return Response.json({ error: '요청 내용을 읽을 수 없습니다.' }, { status: 400, headers });
    return Response.json(
      { error: '요청을 완료하지 못했습니다. 다시 시도해주세요.' },
      { status: 500, headers },
    );
  }
}

export async function readPlanBody(request: Request): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json')
    throw new RequestError('JSON 형식으로 요청해주세요.', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError('Empty body');
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 20 * 1_024) {
        await reader.cancel();
        throw new RequestError('요청 내용이 너무 큽니다.', 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text);
  } finally {
    reader.releaseLock();
  }
}
