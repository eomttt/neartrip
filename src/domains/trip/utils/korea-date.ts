export function koreaDate(now = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
    .replaceAll('-', '');
}

export function koreaWeekRange(now = new Date()): { start: string; end: string } {
  const date = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  date.setUTCDate(date.getUTCDate() + ((7 - date.getUTCDay()) % 7));
  return {
    start: koreaDate(now),
    end: date.toISOString().slice(0, 10).replaceAll('-', ''),
  };
}
