import { z } from 'zod';

export async function requestJson(path: string, options?: RequestInit): Promise<unknown> {
  const response = await fetch(path, options);
  const data: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(data);
    throw new Error(error.success ? error.data.error : '요청을 완료하지 못했습니다.');
  }
  return data;
}
