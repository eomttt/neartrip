// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { cleanup, render, screen } from '@testing-library/react';
import { RouteSummary } from '.';
import { demoOrigin, createDemoLeg } from '../../../../../server/demo';

afterEach(cleanup);

function withQueries(children: React.ReactNode) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

it('주의 구간에서도 경고와 이동 안내, 합산 시간을 함께 보여준다', () => {
  const destination = { ...demoOrigin, id: 'destination', name: '도착 장소', lat: 37.55 };
  const leg = createDemoLeg(demoOrigin, destination);
  render(
    withQueries(
      <RouteSummary
        destination={null}
        origin={demoOrigin}
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
        onEdit={vi.fn()}
        onFocusRoute={vi.fn()}
      />,
    ),
  );
  expect(screen.getByText('동선을 만들었어요 · 주의 구간 포함')).toBeTruthy();
  expect(screen.getByText('도보 20분을 넘어요.')).toBeTruthy();
  expect(screen.getByText('공원길을 따라 이동하세요')).toBeTruthy();
  expect(screen.getByText(/표시된 경로 합산 · 25분/)).toBeTruthy();
  expect(screen.queryByText('같은 위치 · 이동 없음')).toBeNull();
});

it('구간 안내를 키보드로 열고 닫으며 새 주의 동선은 다시 펼친다', async () => {
  const user = userEvent.setup();
  const destination = { ...demoOrigin, id: 'destination', name: '도착 장소', lat: 37.55 };
  const leg = createDemoLeg(demoOrigin, destination);
  const props = {
    destination: null,
    origin: demoOrigin,
    itinerary: { demo: true, places: [destination], legs: [leg] },
    onEdit: vi.fn(),
    onFocusRoute: vi.fn(),
  };
  const { rerender } = render(withQueries(<RouteSummary {...props} />));
  const toggle = screen.getByRole('button', { name: '구간별 이동 보기' });
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(screen.queryByRole('region', { name: '구간별 이동 안내' })).toBeNull();
  toggle.focus();
  await user.keyboard('{Enter}');
  const details = screen.getByRole('region', { name: '구간별 이동 안내' });
  expect(details.tabIndex).toBe(0);
  expect(toggle.getAttribute('aria-controls')).toBe(details.id);
  await user.keyboard(' ');
  expect(screen.queryByRole('region', { name: '구간별 이동 안내' })).toBeNull();
  rerender(
    withQueries(
      <RouteSummary
        {...props}
        itinerary={{ ...props.itinerary, legs: [{ ...leg, warning: '도보 20분을 넘어요.' }] }}
      />,
    ),
  );
  expect(screen.getByRole('region', { name: '구간별 이동 안내' })).toBeTruthy();
  expect(
    screen.getByRole('button', { name: '구간별 이동 보기' }).getAttribute('aria-expanded'),
  ).toBe('true');
});
