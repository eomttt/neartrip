import 'server-only';
import { z } from 'zod';
import rawAreas from './data/seoul-crowding-areas.json';
import type { Coordinate } from '../src/domains/trip/models/model-trip';
const pointSchema = z.tuple([z.number(), z.number()]);
const areaSchema = z.object({
  code: z.string(),
  name: z.string(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  polygons: z.array(z.array(z.array(pointSchema))),
});
export const seoulAreas = z.array(areaSchema).parse(rawAreas);
export type SeoulArea = z.infer<typeof areaSchema>;
type Point = z.infer<typeof pointSchema>;
function ringContains([x, y]: Point, ring: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const [ax, ay] = a;
    const [bx, by] = b;
    const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax);
    if (
      Math.abs(cross) < 1e-12 &&
      x >= Math.min(ax, bx) &&
      x <= Math.max(ax, bx) &&
      y >= Math.min(ay, by) &&
      y <= Math.max(ay, by)
    )
      return true;
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}
export function areaContains(area: SeoulArea, { lng, lat }: Coordinate) {
  const [minX, minY, maxX, maxY] = area.bbox;
  if (lng < minX || lng > maxX || lat < minY || lat > maxY) return false;
  return area.polygons.some(
    ([outer, ...holes]) =>
      !!outer &&
      ringContains([lng, lat], outer) &&
      !holes.some((hole) => ringContains([lng, lat], hole)),
  );
}
export function findSeoulArea(point: Coordinate) {
  return seoulAreas.find((area) => areaContains(area, point));
}
