import type { Locale } from '../i18n/locale';

declare global {
  interface Window {
    neartripGoogleMapsReady?: () => void;
    gm_authFailure?: () => void;
  }
}

let loading: Promise<void> | undefined;

export function loadGoogleMap(key: string, locale: Locale): Promise<void> {
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    const params = new URLSearchParams({
      key,
      language: locale,
      region: 'KR',
      v: 'quarterly',
      loading: 'async',
      callback: 'neartripGoogleMapsReady',
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    const cleanup = () => {
      window.clearTimeout(timeout);
      delete window.neartripGoogleMapsReady;
    };
    const fail = () => {
      cleanup();
      script.remove();
      loading = undefined;
      window.dispatchEvent(new Event('neartrip-google-map-error'));
      reject(
        new Error('Google Maps could not load. Please check the connection and map configuration.'),
      );
    };
    const timeout = window.setTimeout(fail, 15_000);
    window.neartripGoogleMapsReady = () => {
      if (typeof google === 'undefined' || !google.maps?.Map) {
        fail();
        return;
      }
      cleanup();
      resolve();
    };
    window.gm_authFailure = fail;
    script.onerror = fail;
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    loading = undefined;
    throw error;
  });
  return loading;
}
