import type { Category, Leg, Place } from '../src/domains/trip/models/model-trip';
import { distanceMeters } from '../src/domains/trip/utils/route-order';

export const demoOrigin: Place = {
  id: 'demo-origin',
  name: '성수역',
  address: '서울 성동구 · 예시 시작점',
  category: 'attraction',
  lat: 37.54458,
  lng: 127.05598,
  description: '오늘의 작은 여행이 시작되는 곳',
  url: '',
};
export const demoPlaces: Place[] = [
  {
    id: 'demo-1',
    name: '작은 식탁',
    category: 'restaurant',
    lat: 37.5435,
    lng: 127.0529,
    description: '갓 지은 밥으로 시작하는 든든한 하루',
    address: '성수동 예시 골목 1',
    url: '',
  },
  {
    id: 'demo-2',
    name: '오후의 커피',
    category: 'cafe',
    lat: 37.5461,
    lng: 127.0508,
    description: '햇살이 머무는 창가, 천천히 마시는 커피',
    address: '성수동 예시 골목 2',
    url: '',
  },
  {
    id: 'demo-3',
    name: '초록 산책길',
    category: 'attraction',
    lat: 37.5442,
    lng: 127.0458,
    description: '도시에서 잠깐 벗어나는 초록빛 산책',
    address: '성수동 예시 골목 3',
    url: '',
  },
  {
    id: 'demo-4',
    name: '온기 베이커리',
    category: 'cafe',
    lat: 37.5413,
    lng: 127.0552,
    description: '골목을 채우는 빵 굽는 냄새',
    address: '성수동 예시 골목 4',
    url: '',
  },
  {
    id: 'demo-5',
    name: '골목 파스타',
    category: 'restaurant',
    lat: 37.5471,
    lng: 127.0572,
    description: '작은 주방에서 만드는 한 접시',
    address: '성수동 예시 골목 5',
    url: '',
  },
  {
    id: 'demo-6',
    name: '취향 서점',
    category: 'attraction',
    lat: 37.5408,
    lng: 127.0502,
    description: '생각지도 못한 책 한 권을 만나는 곳',
    address: '성수동 예시 골목 6',
    url: '',
  },
  {
    id: 'demo-7',
    name: '모퉁이 소반',
    category: 'restaurant',
    lat: 37.545,
    lng: 127.0598,
    description: '제철 재료로 차려낸 정갈한 한 끼',
    address: '성수동 예시 골목 7',
    url: '',
  },
  {
    id: 'demo-8',
    name: '작은 전시실',
    category: 'attraction',
    lat: 37.548,
    lng: 127.0534,
    description: '가볍게 들러 새 시선을 발견하는 공간',
    address: '성수동 예시 골목 8',
    url: '',
  },
];

export function nearbyDemo(origin: Place, category: Category | undefined, radius: number): Place[] {
  return demoPlaces
    .filter(
      (place) =>
        place.id !== origin.id &&
        (!category || place.category === category) &&
        distanceMeters(origin, place) <= radius,
    )
    .toSorted((a, b) => distanceMeters(origin, a) - distanceMeters(origin, b));
}

export function createDemoLeg(from: Place, to: Place): Leg {
  const meters = Math.round(distanceMeters(from, to) * 1.25);
  return {
    from,
    to,
    warning: null,
    segments: [
      {
        mode: 'walk',
        meters,
        seconds: Math.round(meters / 1.2),
        stops: 0,
        instruction: '예시 이동 · 실제 길찾기가 아닙니다',
        points: [from, to],
      },
    ],
  };
}
