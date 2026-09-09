import { describe, expect, it } from 'vitest';
import { demoOrigin, demoPlaces } from '../../../../server/demo';
import { distanceMeters, orderRoundTrip } from './route-order';
import { planRequestSchema, type Place } from '../models/model-trip';

describe('하루 동선', () => {
  it('빈 일정은 빈 순서를 반환한다', () => {
    expect(orderRoundTrip(demoOrigin, [])).toEqual([]);
  });
  it('선택 장소를 빠짐없이 한 번씩 포함하고 입력 순서를 변경하지 않는다', () => {
    const places = demoPlaces.slice(0, 5);
    const before = [...places];
    const ordered = orderRoundTrip(demoOrigin, places);
    expect(ordered.map((place) => place.id).toSorted()).toEqual(
      places.map((place) => place.id).toSorted(),
    );
    expect(places).toEqual(before);
    function loopDistance(list: Place[]) {
      const points = [demoOrigin, ...list, demoOrigin];
      return points.slice(1).reduce((sum, place, index) => {
        const previous = points[index];
        return sum + (previous ? distanceMeters(previous, place) : 0);
      }, 0);
    }
    expect(loopDistance(ordered)).toBeLessThanOrEqual(loopDistance(places));
  });
  it('동일한 좌표의 거리는 0이다', () => {
    expect(distanceMeters(demoOrigin, demoOrigin)).toBe(0);
  });
  it('시작점 중복, 같은 장소 중복, 6곳 선택을 거부한다', () => {
    expect(planRequestSchema.safeParse({ origin: demoOrigin, places: [demoOrigin] }).success).toBe(
      false,
    );
    const place = demoPlaces[0];
    expect(
      planRequestSchema.safeParse({ origin: demoOrigin, places: [place, place] }).success,
    ).toBe(false);
    expect(
      planRequestSchema.safeParse({ origin: demoOrigin, places: demoPlaces.slice(0, 6) }).success,
    ).toBe(false);
  });
});
