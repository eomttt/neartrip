// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  document.head.querySelectorAll('script').forEach((script) => script.remove());
  delete window.neartripGoogleMapsReady;
  delete window.gm_authFailure;
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.resetModules();
});

it('SDK를 한 번 로드하고 브라우저 언어와 한국 지역을 전달한다', async () => {
  const { loadGoogleMap } = await import('./google-loader');
  vi.stubGlobal('google', { maps: { Map: class {} } });
  const first = loadGoogleMap('public-key', 'en');
  expect(loadGoogleMap('public-key', 'en')).toBe(first);
  const scripts = document.head.querySelectorAll('script');
  expect(scripts).toHaveLength(1);
  const url = new URL(scripts[0]?.src ?? '');
  expect(url.searchParams.get('language')).toBe('en');
  expect(url.searchParams.get('region')).toBe('KR');
  window.neartripGoogleMapsReady?.();
  await expect(first).resolves.toBeUndefined();
});

it('SDK 로딩 실패 후 재시도할 수 있다', async () => {
  const { loadGoogleMap } = await import('./google-loader');
  const first = loadGoogleMap('public-key', 'ko');
  const failed = expect(first).rejects.toThrow('Google Maps');
  document.head.querySelector('script')?.dispatchEvent(new Event('error'));
  await failed;
  vi.stubGlobal('google', { maps: { Map: class {} } });
  const second = loadGoogleMap('public-key', 'ko');
  window.neartripGoogleMapsReady?.();
  await expect(second).resolves.toBeUndefined();
});

it('SDK 로드 뒤 발생한 키 인증 실패도 화면에 알린다', async () => {
  const { loadGoogleMap } = await import('./google-loader');
  vi.stubGlobal('google', { maps: { Map: class {} } });
  const onFailure = vi.fn();
  window.addEventListener('neartrip-google-map-error', onFailure);
  try {
    const ready = loadGoogleMap('public-key', 'en');
    window.neartripGoogleMapsReady?.();
    await ready;
    window.gm_authFailure?.();
    expect(onFailure).toHaveBeenCalledOnce();
    expect(document.head.querySelector('script')).toBeNull();
  } finally {
    window.removeEventListener('neartrip-google-map-error', onFailure);
  }
});
