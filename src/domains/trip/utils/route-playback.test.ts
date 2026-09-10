import { describe, expect, it } from 'vitest';
import { createRoutePlayback, getPlaybackPosition } from './route-playback';
import type { Coordinate, Segment } from '../models/model-trip';

function segment(points: Coordinate[]): Segment {
  return { mode: 'walk', seconds: 120, meters: 100, instruction: '이동', stops: 0, points };
}

describe('이동 미리보기 위치', () => {
  it('굽은 경로를 순서대로 따라가고 시작·도착 좌표를 보존한다', () => {
    const a = { lat: 37.54, lng: 127.05 };
    const b = { lat: 37.54, lng: 127.06 };
    const c = { lat: 37.55, lng: 127.06 };
    const path = createRoutePlayback([segment([a, b, c])]);
    expect(getPlaybackPosition(path, 0)).toEqual(a);
    expect(getPlaybackPosition(path, 0.2)?.lat).toBe(a.lat);
    expect(getPlaybackPosition(path, 0.8)?.lng).toBe(c.lng);
    expect(getPlaybackPosition(path, 1)).toEqual(c);
  });
  it('누락된 연결 구간을 가로질러 이동하지 않는다', () => {
    const path = createRoutePlayback([
      segment([
        { lat: 37.54, lng: 127.05 },
        { lat: 37.54, lng: 127.06 },
      ]),
      segment([
        { lat: 37.56, lng: 127.08 },
        { lat: 37.56, lng: 127.09 },
      ]),
    ]);
    expect(path.edges).toHaveLength(2);
    expect(getPlaybackPosition(path, 0.6)?.lat).toBe(37.56);
  });
  it('빈 경로나 같은 좌표만 있는 경로는 움직임을 만들지 않는다', () => {
    const point = { lat: 37.54, lng: 127.05 };
    expect(getPlaybackPosition(createRoutePlayback([]), 0.5)).toBeNull();
    expect(getPlaybackPosition(createRoutePlayback([segment([point, point])]), 0.5)).toBeNull();
  });
});
