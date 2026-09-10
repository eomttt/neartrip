// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RouteSummary } from '.';
import { demoOrigin, createDemoLeg } from '../../../../../server/demo';

afterEach(cleanup);

it('주의 구간에서도 경고와 이동 안내, 합산 시간을 함께 보여준다', () => {
  const destination = { ...demoOrigin, id: 'destination', name: '도착 장소', lat: 37.55 };
  const leg = createDemoLeg(demoOrigin, destination);
  render(
    <RouteSummary
      origin={demoOrigin}
      selected={[destination]}
      itinerary={{
        demo: false,
        places: [destination],
        legs: [
          {
            ...leg,
            warning: '도보 20분을 넘어요.',
            segments: leg.segments.map((segment) => ({
              ...segment,
              seconds: 1500,
              instruction: '공원길을 따라 이동하세요',
            })),
          },
        ],
      }}
      isPlanning={false}
      onRemove={vi.fn()}
      onMove={vi.fn()}
      onReset={vi.fn()}
      onBuild={vi.fn()}
    />,
  );
  expect(screen.getByText('동선을 만들었어요 · 주의 구간 포함')).toBeTruthy();
  expect(screen.getByText('도보 20분을 넘어요.')).toBeTruthy();
  expect(screen.getByText('공원길을 따라 이동하세요')).toBeTruthy();
  expect(screen.getByText(/표시된 경로 합산 · 25분/)).toBeTruthy();
  expect(screen.queryByText('같은 위치 · 이동 없음')).toBeNull();
});
