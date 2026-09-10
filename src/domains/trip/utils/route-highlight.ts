import type { Coordinate, Itinerary, Segment } from '../models/model-trip';

export interface RouteHighlight {
  label: string;
  segments: Segment[];
  destination: Coordinate;
}

export interface RouteMapHandle {
  highlightRoute: (highlight: RouteHighlight) => void;
}

export function getRouteHighlight(
  itinerary: Itinerary,
  legIndex: number,
  segmentIndex: number | null,
): RouteHighlight | null {
  const leg = itinerary.legs[legIndex];
  if (!leg) return null;
  const segment = segmentIndex === null ? null : leg.segments[segmentIndex];
  if (segmentIndex !== null && !segment) return null;
  const segments = segment ? [segment] : leg.segments;
  return {
    label: segment ? segment.instruction : `${leg.from.name} → ${leg.to.name}`,
    segments,
    destination: segments.at(-1)?.points.at(-1) ?? leg.to,
  };
}
