import type { Coordinate, Segment } from '../models/model-trip';
import { distanceMeters } from './route-order';

export function createRoutePlayback(segments: Segment[]) {
  let total = 0;
  const edges = segments.flatMap((segment) =>
    segment.points.slice(1).flatMap((to, index) => {
      const from = segment.points[index];
      if (!from) return [];
      const distance = distanceMeters(from, to);
      if (distance === 0) return [];
      const start = total;
      total += distance;
      return [{ from, to, start, end: total }];
    }),
  );
  return { edges, total };
}

export function getPlaybackPosition(
  path: ReturnType<typeof createRoutePlayback>,
  progress: number,
): Coordinate | null {
  const distance = Math.max(0, Math.min(1, progress)) * path.total;
  const edge = path.edges.find((value) => value.end >= distance) ?? path.edges.at(-1);
  if (!edge) return null;
  const ratio = (distance - edge.start) / (edge.end - edge.start);
  return {
    lat: edge.from.lat + (edge.to.lat - edge.from.lat) * ratio,
    lng: edge.from.lng + (edge.to.lng - edge.from.lng) * ratio,
  };
}

export function playRoute(
  segments: Segment[],
  onPosition: (position: Coordinate) => void,
): () => void {
  const path = createRoutePlayback(segments);
  const start = getPlaybackPosition(path, 0);
  if (!start) return () => {};
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let started = performance.now();
  let previous = -Infinity;
  function tick(now: number) {
    if (now - previous >= 32) {
      // 실제 이동 속도와 무관한 미리보기: 4초 이동 후 1초 머물고 반복합니다.
      const position = getPlaybackPosition(path, Math.min(1, ((now - started) % 5000) / 4000));
      if (position) onPosition(position);
      previous = now;
    }
    frame = window.requestAnimationFrame(tick);
  }
  const restart = () => {
    window.cancelAnimationFrame(frame);
    onPosition(start);
    started = performance.now();
    previous = -Infinity;
    if (!preference.matches) frame = window.requestAnimationFrame(tick);
  };
  preference.addEventListener('change', restart);
  restart();
  return () => {
    window.cancelAnimationFrame(frame);
    preference.removeEventListener('change', restart);
  };
}
