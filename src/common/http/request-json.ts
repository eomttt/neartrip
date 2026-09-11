import { z } from 'zod';

export async function requestJson(path: string, options?: RequestInit): Promise<unknown> {
  const response = await fetch(path, options);
  const data: unknown = await response.json();
  if (!response.ok) {
    const error = z
      .object({ error: z.string(), traceId: z.string().uuid().optional() })
      .safeParse(data);
    if (!error.success) throw new Error('요청을 완료하지 못했습니다.');
    throw new Error(
      error.data.traceId ? `${error.data.error} 추적 ID: ${error.data.traceId}` : error.data.error,
    );
  }
  return data;
}
