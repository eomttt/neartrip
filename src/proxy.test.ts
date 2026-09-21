import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { config, proxy } from './proxy';

describe('브라우저 선호 언어로 접속', () => {
  it.each([
    ['ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7', 'ko'],
    ['en-US,en;q=0.9,ko;q=0.8', 'en'],
    ['en;q=0.2,ko-KR;q=0.9', 'ko'],
    ['ko;q=0.2,en-GB;q=0.9', 'en'],
    ['ja-JP,ko-KR;q=0.8,en;q=0.7', 'ko'],
    ['KO-kr,en;q=0.5', 'ko'],
    ['ko;q=0,en;q=0.5', 'en'],
    ['en;q=0,ko;q=0.5', 'ko'],
    ['ko;q=invalid,en;q=0.5', 'en'],
    ['ja-JP,fr;q=0.8', 'en'],
    ['*', 'en'],
    ['', 'en'],
  ])('%s 요청을 %s로 연다', (languages, locale) => {
    const request = new NextRequest('https://neartrip.example/', {
      headers: { 'accept-language': languages },
    });

    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://neartrip.example/' + locale);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('vary')).toBe('Accept-Language');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('기존 언어 쿠키보다 현재 브라우저 설정을 따른다', () => {
    const request = new NextRequest('https://neartrip.example/?utm_source=campaign', {
      headers: { 'accept-language': 'en-US,ko;q=0.5', cookie: 'i18next=ko; session=example' },
    });

    const response = proxy(request);

    expect(response.headers.get('location')).toBe(
      'https://neartrip.example/en?utm_source=campaign',
    );
    expect(request.cookies.get('session')?.value).toBe('example');
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('개인정보 안내도 같은 선호 언어로 연다', () => {
    const response = proxy(
      new NextRequest('https://neartrip.example/privacy', {
        headers: { 'accept-language': 'ko-KR,en;q=0.5' },
      }),
    );

    expect(response.headers.get('location')).toBe('https://neartrip.example/ko/privacy');
  });

  it.each([
    ['/', true],
    ['/privacy', true],
    ['/ko', false],
    ['/en', false],
    ['/ko/privacy', false],
    ['/en/privacy', false],
    ['/api/config', false],
    ['/ads.txt', false],
    ['/robots.txt', false],
    ['/sitemap.xml', false],
    ['/_next/static/chunks/app.js', false],
  ])('%s 경로의 자동 언어 선택 여부는 %s다', (url, expected) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(expected);
  });
});
