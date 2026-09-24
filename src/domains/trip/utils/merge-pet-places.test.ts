import { expect, it } from 'vitest';
import { demoOrigin } from '../../../../server/demo';
import type { Place } from '../models/model-trip';
import { mergePetPlaces } from './merge-pet-places';

const cafe: Place = {
  ...demoOrigin,
  id: 'google:1',
  name: '성수 카페',
  category: 'cafe',
  url: 'https://www.google.com/maps/search/?api=1&query=cafe&query_place_id=1',
};
const pet: Place = {
  ...cafe,
  id: 'tourapi:1',
  name: '성수카페',
  tourism: { kind: 'pet', conditions: '소형견 · 야외 좌석' },
};
it('이름과 좌표가 일치하면 Google ID·분류·링크를 유지하고 조건을 붙인다', () => {
  expect(mergePetPlaces([cafe], [pet])).toEqual([{ ...cafe, tourism: pet.tourism }]);
  expect(cafe.tourism).toBeUndefined();
});
it('같은 이름의 먼 지점이나 옆 가게에 동반 정보를 붙이지 않는다', () => {
  const distant = { ...pet, lat: pet.lat + 0.01 };
  const other = { ...pet, id: 'tourapi:2', name: '다른 카페' };
  expect(mergePetPlaces([cafe], [distant, other])).toEqual([cafe, distant, other]);
});
it('정보가 없으면 원래 목록을 유지하고 반복 페이지는 중복하지 않는다', () => {
  expect(mergePetPlaces([cafe], [])).toEqual([cafe]);
  expect(mergePetPlaces([], [pet, pet])).toEqual([pet]);
});
it('이름과 위치가 같은 후보가 여러 개면 동반 여부를 추측하지 않는다', () => {
  const duplicate = { ...cafe, id: 'google:2' };
  expect(mergePetPlaces([cafe, duplicate], [pet])).toEqual([cafe, duplicate]);
});
