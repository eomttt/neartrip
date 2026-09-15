import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, type Locale } from '@/common/i18n/locale';

function preferredLocale(request: NextRequest): Locale {
  const languages = request.headers.get('accept-language')?.toLowerCase() ?? '';
  return languages.split(',').some((language) => language.trim().startsWith('ko'))
    ? 'ko'
    : defaultLocale;
}

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLocale(request)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/'] };
