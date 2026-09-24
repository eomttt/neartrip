import type { Place } from '../models/model-trip';

export function getNaverPlaceUrl(place: Place): string | null {
  if (place.id.startsWith('demo-') || !place.url) return null;
  const query = [place.address, place.name].filter(Boolean).join(' ');
  return `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
}

export function getPlaceDetailUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' &&
      parsed.hostname === 'www.google.com' &&
      parsed.pathname.startsWith('/maps/') &&
      !parsed.username &&
      !parsed.password
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}

export function getAttributionUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password
      ? parsed.href
      : undefined;
  } catch {
    return undefined;
  }
}
