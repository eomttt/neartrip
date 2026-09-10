import { useEffect, useRef } from 'react';
import type { Coordinate, Segment } from '../../models/model-trip';
import { playRoute } from '../../utils/route-playback';

export function RoutePlaybackMarker({
  segments,
  destination,
  project,
}: {
  segments: Segment[];
  destination: Coordinate;
  project: (coordinate: Coordinate) => { x: number; y: number };
}) {
  const marker = useRef<SVGCircleElement>(null);
  const initial = project(segments[0]?.points[0] ?? destination);
  useEffect(
    () =>
      playRoute(segments, (position) => {
        const point = project(position);
        marker.current?.setAttribute('cx', String(point.x));
        marker.current?.setAttribute('cy', String(point.y));
      }),
    [segments, project],
  );
  return (
    <circle
      ref={marker}
      className="route-playback-dot"
      cx={initial.x}
      cy={initial.y}
      r="11"
      fill="var(--route-highlight)"
      stroke="white"
      strokeWidth="5"
    />
  );
}
