export function getKakaoPlaceDetailUrl(url: string): string | null {
  return /^https?:\/\/place\.map\.kakao\.com\/\d+\/?$/.test(url)
    ? url.replace(/^http:/, 'https:')
    : null;
}
