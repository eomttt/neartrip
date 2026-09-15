import type { Locale } from '@/common/i18n/locale';

const englishMessages = new Map<string, string>([
  [
    '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    'Too many requests. Please try again shortly.',
  ],
  [
    '요청 또는 지도 응답의 형식이 올바르지 않습니다.',
    'The request or map response was not in the expected format.',
  ],
  ['요청 내용을 읽을 수 없습니다.', 'Could not read the request.'],
  [
    '요청을 완료하지 못했습니다. 다시 시도해주세요.',
    'Could not complete the request. Please try again.',
  ],
  ['카카오 REST API 키가 설정되지 않았습니다.', 'The Kakao REST API key is not configured.'],
  [
    '카카오 응답이 늦어지고 있습니다. 잠시 후 다시 시도해주세요.',
    'Kakao is responding slowly. Please try again shortly.',
  ],
  ['카카오 API 키 또는 사용 권한을 확인해주세요.', 'Check the Kakao API key and permissions.'],
  [
    '카카오 API 호출 한도에 도달했습니다. 잠시 후 다시 시도해주세요.',
    'The Kakao API limit has been reached. Please try again shortly.',
  ],
  [
    '지금은 행사·반려견 장소 정보를 이용할 수 없어요. 주변 장소는 계속 이용할 수 있어요.',
    'Events and dog-friendly places are unavailable right now. Nearby places are still available.',
  ],
  [
    '관광정보 응답이 늦어지고 있어요. 잠시 후 다시 시도해주세요.',
    'Tourism data is responding slowly. Please try again shortly.',
  ],
  [
    '관광정보를 불러오지 못했어요. API 인증과 사용 권한을 확인해주세요.',
    'Could not load tourism data. Check the API key and permissions.',
  ],
  [
    '관광정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.',
    'Could not load tourism data. Please try again shortly.',
  ],
  [
    '관광정보 응답 형식이 달라 정보를 표시하지 못했어요.',
    'The tourism response format changed, so the data cannot be shown.',
  ],
  [
    '관광정보를 불러오지 못했어요. API 인증과 사용 한도를 확인해주세요.',
    'Could not load tourism data. Check API access and limits.',
  ],
  ['관광정보 응답에 목록이 없어요.', 'The tourism response did not include a list.'],
  [
    '카카오맵에서 같은 지점으로 안내되는 구간이에요. 현장에서 위치를 확인해주세요.',
    'KakaoMap treats this leg as the same place. Check the exact location when you arrive.',
  ],
  [
    '이 구간의 이동 경로를 찾지 못했어요. 장소나 방문 순서를 확인해주세요.',
    'No route was found for this leg. Check the place or visit order.',
  ],
  [
    '대중교통 정거장 수를 확인하지 못했어요.',
    'The number of public transit stops could not be confirmed.',
  ],
  [
    '일부 연결 도보를 찾지 못해 확인된 경로만 표시해요.',
    'Some walking connections were unavailable. Only confirmed route sections are shown.',
  ],
  ['예시 이동 · 실제 길찾기가 아닙니다', 'Sample route · not actual directions'],
  [
    '지도를 불러오지 못했어요. 키와 허용 도메인을 확인해주세요.',
    'Could not load the map. Check the key and allowed domains.',
  ],
  ['카카오 지도 설정을 확인해주세요.', 'Check the Kakao map configuration.'],
  [
    '지도에 연결하지 못했어요. 네트워크를 확인해주세요.',
    'Could not connect to the map. Check your network connection.',
  ],
  [
    '이번 주 일요일까지 열리는 행사예요. 운영 시간은 방문 전에 확인해주세요.',
    'This event runs through Sunday. Check opening hours before visiting.',
  ],
  [
    '반려동물 동반 여행지예요. 반려견 크기와 입장 조건을 방문 전에 확인해주세요.',
    'This destination welcomes pets. Check dog size and entry rules before visiting.',
  ],
]);

function translatePattern(message: string): string {
  return message
    .replace(
      /^도보 이동이 (\d+)분으로 권장 기준인 20분을 넘어요\.$/,
      'Walking takes $1 min, longer than the recommended 20 min.',
    )
    .replace(
      /^대중교통이 (\d+)정거장으로 권장 기준인 5정거장을 넘어요\.$/,
      'Public transit takes $1 stops, more than the recommended 5.',
    );
}

export function localizeTripText(locale: Locale, message: string): string {
  if (locale === 'ko') return message;
  const traceMarker = ' 추적 ID: ';
  const markerIndex = message.lastIndexOf(traceMarker);
  const source = markerIndex >= 0 ? message.slice(0, markerIndex) : message;
  const traceId = markerIndex >= 0 ? message.slice(markerIndex + traceMarker.length) : '';
  const translated = englishMessages.get(source) ?? translatePattern(source);
  return traceId ? `${translated} Trace ID: ${traceId}` : translated;
}
