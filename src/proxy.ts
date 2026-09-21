import type { NextRequest } from 'next/server';
import { createProxy } from 'next-i18next/proxy';
import { i18nConfig } from '@/common/i18n/config';

const languageProxy = createProxy(i18nConfig);

export function proxy(request: NextRequest) {
  // 저장된 언어가 브라우저의 현재 선호 언어를 덮어쓰지 않게 한다.
  request.cookies.delete(i18nConfig.cookieName);
  const response = languageProxy(request);
  response.headers.set('Vary', 'Accept-Language');
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = { matcher: ['/', '/privacy'] };
