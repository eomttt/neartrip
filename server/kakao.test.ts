import { describe, expect, it } from 'vitest';
import { isShortTransit, transitResponseToCandidates, walkResponseToSegments } from './kakao';
import type { Segment } from '../src/domains/trip/models/model-trip';

function transit(stops: number | null): Segment {
  return { mode: 'bus', seconds: 300, meters: 1_000, instruction: '버스', stops, points: [] };
}

describe('이동 제한과 응답 검증', () => {
  it('환승 전후 정거장을 합산한다', () => {
    expect(isShortTransit([transit(3), transit(2)])).toBe(true);
    expect(isShortTransit([transit(3), transit(3)])).toBe(false);
  });
  it('정거장 정보가 없거나 도보 연결이 20분을 넘으면 통과시키지 않는다', () => {
    expect(isShortTransit([transit(null)])).toBe(false);
    expect(isShortTransit([transit(2), { ...transit(0), mode: 'walk', seconds: 1_201 }])).toBe(
      false,
    );
  });
  it('도보 응답의 경도/위도를 뒤집지 않는다', () => {
    const segments = walkResponseToSegments({
      status: 'OK',
      route: {
        legs: [
          {
            steps: [
              {
                properties: { time: 120, distance: 150, guidance: '골목길' },
                path: {
                  points: [
                    [127.05, 37.54],
                    [127.06, 37.55],
                  ],
                },
              },
            ],
          },
        ],
      },
    });
    expect(segments[0]?.points[0]).toEqual({ lng: 127.05, lat: 37.54 });
  });
  it('경로가 없으면 직선으로 대체하지 않는다', () => {
    expect(walkResponseToSegments({ status: 'ROUTE_RESULT_NOT_FOUND' })).toEqual([]);
    expect(transitResponseToCandidates({ status: 'NO_RESULTS' })).toEqual([]);
  });
  it('알 수 없는 형식을 빈 성공으로 숨기지 않는다', () => {
    expect(() => walkResponseToSegments({ status: 'OK', route: {} })).toThrow();
  });
});
