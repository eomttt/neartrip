import { describe, expect, it } from 'vitest';
import { getRouteHighlight } from './route-highlight';
import { createDemoLeg, demoOrigin, demoPlaces } from '../../../../server/demo';

const destination = demoPlaces[0] ?? demoOrigin;
const leg = createDemoLeg(demoOrigin, destination);
const itinerary = { demo: true, places: [destination], legs: [leg] };

describe('지도에서 강조할 구간', () => {
  it('경고가 있어도 조회된 구간 좌표를 유지한다', () => {
    const highlight = getRouteHighlight(
      { ...itinerary, legs: [{ ...leg, warning: '20분 초과' }] },
      0,
      0,
    );
    expect(highlight?.segments).toEqual(leg.segments);
    expect(highlight?.destination).toEqual(leg.segments[0]?.points.at(-1));
  });
  it('경로가 없는 구간은 목적지만 강조하고 가짜 선을 만들지 않는다', () => {
    const highlight = getRouteHighlight(
      { ...itinerary, legs: [{ ...leg, segments: [], warning: '경로 없음' }] },
      0,
      null,
    );
    expect(highlight?.segments).toEqual([]);
    expect(highlight?.destination).toEqual(destination);
    expect(getRouteHighlight(itinerary, 5, null)).toBeNull();
    expect(getRouteHighlight(itinerary, 0, 5)).toBeNull();
  });
});
