import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const MAX_CALLS = 24;
const MAX_BODY_BYTES = 6_000;
const secretField = /authorization|cookie|password|secret|token|api.?key|service.?key|headers/i;

type LogValue = null | boolean | number | string | LogValue[] | { [key: string]: LogValue };
interface ProviderCall {
  provider: 'kakao' | 'tourapi' | 'seoul' | 'google';
  leg: number | null;
  api: string;
  params: LogValue;
  status: number | null;
  durationMs: number;
  state: 'pending' | 'ok' | 'error';
  body?: LogValue;
  error?: LogValue;
}
interface Trace {
  id: string;
  startedAt: number;
  requestBody?: LogValue;
  error?: LogValue;
  calls: ProviderCall[];
  omittedCalls: number;
}
const context = new AsyncLocalStorage<{ trace: Trace; leg: number | null }>();

function redactText(value: string): string {
  let result = value.replace(/(?:Bearer|KakaoAK)\s+[^\s"',}]+/gi, '[REDACTED]');
  for (const [name, secret] of Object.entries(process.env)) {
    if (secretField.test(name) && secret && secret.length >= 8) {
      result = result.split(secret).join('[REDACTED]');
      result = result.split(encodeURIComponent(secret)).join('[REDACTED]');
    }
  }
  return result;
}

function sanitize(value: unknown, depth = 0, key = ''): LogValue {
  if (secretField.test(key)) return '[REDACTED]';
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  if (typeof value === 'string') {
    const text = redactText(value);
    return text.length > 512 ? `${text.slice(0, 512)}…[truncated]` : text;
  }
  if (depth > 12) return '[max depth]';
  if (Array.isArray(value)) {
    const limit = key === 'points' ? 4 : 20;
    if (value.length <= limit) return value.map((item) => sanitize(item, depth + 1));
    return {
      length: value.length,
      truncated: true,
      first: value.slice(0, limit / 2).map((item) => sanitize(item, depth + 1)),
      last: value.slice(-limit / 2).map((item) => sanitize(item, depth + 1)),
    };
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    const result = Object.fromEntries(
      entries
        .slice(0, 50)
        .map(([field, item]) => [
          redactText(field).slice(0, 100),
          sanitize(item, depth + 1, field),
        ]),
    );
    if (entries.length > 50) result._omittedFields = entries.length - 50;
    return result;
  }
  return `[${typeof value}]`;
}

function bodyForLog(value: unknown): LogValue {
  const safe = sanitize(value);
  const json = JSON.stringify(safe);
  const bytes = Buffer.byteLength(json);
  if (bytes <= MAX_BODY_BYTES) return safe;
  return { truncated: true, sanitizedBytes: bytes, preview: json.slice(0, 1_500) };
}

function errorForLog(error: unknown): LogValue {
  // JSON 파서의 오류 문구에는 본문 일부가 포함될 수 있습니다.
  if (error instanceof SyntaxError) return { name: 'SyntaxError', message: 'JSON parsing failed' };
  if (error instanceof z.ZodError) {
    return bodyForLog({
      name: 'ZodError',
      issues: error.issues.map(({ code, path }) => ({ code, path })),
    });
  }
  if (error instanceof Error)
    return bodyForLog({ name: error.name, message: error.message, stack: error.stack });
  return { name: 'UnknownError' };
}

export function recordRequestBody(body: unknown) {
  const store = context.getStore();
  if (store) store.trace.requestBody = bodyForLog(body);
}

export function recordRequestError(error: unknown) {
  const store = context.getStore();
  if (store) store.trace.error = errorForLog(error);
}

export function withTraceLeg<T>(leg: number, action: () => Promise<T>): Promise<T> {
  const store = context.getStore();
  return store ? context.run({ ...store, leg }, action) : action();
}

export async function traceProviderCall<T>(
  provider: 'kakao' | 'tourapi' | 'seoul' | 'google',
  api: string,
  params: Record<string, string>,
  action: (record: (status: number, body: unknown) => void) => Promise<T>,
): Promise<T> {
  const store = context.getStore();
  if (!store) return action(() => {});
  const call: ProviderCall = {
    provider,
    leg: store.leg,
    api,
    params: bodyForLog(params),
    status: null,
    durationMs: 0,
    state: 'pending',
  };
  if (store.trace.calls.length >= MAX_CALLS) {
    store.trace.calls.shift();
    store.trace.omittedCalls += 1;
  }
  store.trace.calls.push(call);
  const startedAt = performance.now();
  try {
    const result = await action((status, body) => {
      call.status = status;
      call.body = bodyForLog(body);
    });
    call.state = 'ok';
    return result;
  } catch (error) {
    call.state = 'error';
    call.error = errorForLog(error);
    throw error;
  } finally {
    call.durationMs = Math.round(performance.now() - startedAt);
  }
}

export async function traceApiRequest(
  request: Request,
  action: (traceId: string) => Promise<Response>,
): Promise<Response> {
  const trace: Trace = {
    id: randomUUID(),
    startedAt: performance.now(),
    calls: [],
    omittedCalls: 0,
  };
  return context.run({ trace, leg: null }, async () => {
    const response = await action(trace.id);
    const url = new URL(request.url);
    const partialFailure =
      response.ok && (Boolean(trace.error) || trace.calls.some((call) => call.state === 'error'));
    const metadata = {
      event: partialFailure ? 'api_partial_failure' : response.ok ? 'api_request' : 'api_failure',
      traceId: trace.id,
      method: request.method,
      path: redactText(url.pathname).slice(0, 200),
      status: response.status,
      durationMs: Math.round(performance.now() - trace.startedAt),
    };
    if (response.ok && !partialFailure) {
      console.info(JSON.stringify(metadata));
    } else {
      const calls = [...trace.calls];
      let omittedCalls = trace.omittedCalls;
      while (Buffer.byteLength(JSON.stringify(calls)) > 64_000 && calls.length > 1) {
        const removable = calls.findIndex((call) => call.state !== 'error');
        calls.splice(removable < 0 ? 0 : removable, 1);
        omittedCalls += 1;
      }
      console.error(
        JSON.stringify({
          ...metadata,
          request: {
            query: bodyForLog(Object.fromEntries(url.searchParams)),
            body: trace.requestBody ?? { captured: false },
          },
          response: bodyForLog(await response.clone().json()),
          error: trace.error,
          google: calls.filter((call) => call.provider === 'google'),
          kakao: calls.filter((call) => call.provider === 'kakao'),
          tourapi: calls.filter((call) => call.provider === 'tourapi'),
          seoul: calls.filter((call) => call.provider === 'seoul'),
          omittedCalls,
        }),
      );
    }
    return response;
  });
}

export function traceKakaoCall<T>(
  api: string,
  params: Record<string, string>,
  action: (record: (status: number, body: unknown) => void) => Promise<T>,
) {
  return traceProviderCall('kakao', api, params, action);
}
