export function isCrowdingFresh(observedAt: string, now = Date.now()) {
  const age = now - new Date(observedAt).getTime();
  return Number.isFinite(age) && age >= -5 * 60_000 && age <= 20 * 60_000;
}
