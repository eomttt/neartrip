// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import type { Crowding } from '../../models/model-crowding';
import { CrowdingBadge } from '.';
const value: Crowding = {
  state: 'available',
  areaName: '성수카페거리',
  level: '여유',
  observedAt: '2026-09-11T12:55:00+09:00',
  replacement: false,
  demo: false,
};
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it('혼잡도에 구역과 한국 갱신 시각을 표시하고 개별 매장 정보와 구분한다', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-11T04:00:00Z'));
  render(<CrowdingBadge crowding={value} />);
  expect(screen.getByText('주변 여유')).toBeTruthy();
  expect(screen.getByLabelText('성수카페거리 주변 여유 안내').closest('details')?.open).toBe(false);
  expect(screen.getByText(/성수카페거리/)).toBeTruthy();
  expect(screen.getByText(/12:55/)).toBeTruthy();
  fireEvent.click(screen.getByLabelText('성수카페거리 주변 여유 안내'));
  expect(screen.getByLabelText('성수카페거리 주변 여유 안내').closest('details')?.open).toBe(true);
  expect(screen.getByText(/개별 매장의 빈자리나 대기 인원과 달라요/)).toBeTruthy();
  expect(screen.getByRole('link', { name: '출처: 서울 열린데이터광장' })).toBeTruthy();
  fireEvent.click(screen.getByLabelText('성수카페거리 주변 여유 안내'));
  expect(screen.getByLabelText('성수카페거리 주변 여유 안내').closest('details')?.open).toBe(false);
});
it('화면에 남아 있는 값이 오래되면 갱신 지연과 기준 시각을 보여준다', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-11T05:00:00Z'));
  render(<CrowdingBadge crowding={value} />);
  expect(screen.getByText('주변 혼잡도 갱신 지연')).toBeTruthy();
  expect(screen.getByText('성수카페거리')).toBeTruthy();
  expect(screen.getByText(/12:55/)).toBeTruthy();
  expect(screen.queryByText('주변 여유')).toBeNull();
  fireEvent.click(screen.getByLabelText('성수카페거리 주변 혼잡도 갱신 지연 안내'));
  expect(screen.getByText(/혼잡도 필터에도 반영하지 않아요/)).toBeTruthy();
});
it('서버가 갱신 지연으로 응답하면 지난 혼잡도 등급을 현재 값처럼 보여주지 않는다', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-14T01:44:00Z'));
  render(
    <CrowdingBadge
      crowding={{
        ...value,
        state: 'stale',
        level: '보통',
        observedAt: '2026-09-14T10:15:00+09:00',
      }}
    />,
  );
  expect(screen.getByText('주변 혼잡도 갱신 지연')).toBeTruthy();
  expect(screen.getByText(/10:15/)).toBeTruthy();
  expect(screen.queryByText('주변 보통')).toBeNull();
});
it('예시 등급과 대체 데이터는 표시를 구분한다', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-11T04:00:00Z'));
  render(<CrowdingBadge crowding={{ ...value, demo: true, replacement: true }} />);
  expect(screen.getByText('주변 예시 여유')).toBeTruthy();
  fireEvent.click(screen.getByLabelText('성수카페거리 주변 예시 여유 안내'));
  expect(screen.getByText('서울시 대체 데이터 기준입니다.')).toBeTruthy();
});
const hiddenStates: Crowding['state'][] = ['unsupported', 'not_configured', 'unavailable'];
it.each(hiddenStates)('%s 상태에서는 혼잡도와 구역 정보를 모두 숨긴다', (state) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-11T04:00:00Z'));
  const { container } = render(<CrowdingBadge crowding={{ ...value, state }} />);
  expect(container.childElementCount).toBe(0);
});
