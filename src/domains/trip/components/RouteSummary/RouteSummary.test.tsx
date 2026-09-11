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

it('각 구간의 방향과 이동수단에 맞는 카카오맵 링크를 별도로 제공한다', async () => {
  const user = userEvent.setup();
  const destination = { ...demoOrigin, id: 'destination', name: '카페 / 쉼, #1', lat: 37.55 };
  const outward = createDemoLeg(demoOrigin, destination);
  const returning = createDemoLeg(destination, demoOrigin);
  const onFocusRoute = vi.fn();
  render(
    withQueries(
      <RouteSummary
        origin={demoOrigin}
        destination={null}
        onEdit={vi.fn()}
        onFocusRoute={onFocusRoute}
        initiallyExpanded
        itinerary={{
          demo: false,
          places: [destination],
          legs: [
            outward,
            {
              ...returning,
              segments: returning.segments.map((segment) => ({ ...segment, mode: 'bus' })),
            },
            {
              ...outward,
              to: { ...destination, id: 'third' },
              segments: [],
              warning: '경로를 확인해주세요.',
            },
          ],
        }}
      />,
    ),
  );
  const outwardLink = screen.getByRole('link', { name: /^1구간 카카오맵/ });
  const returningLink = screen.getByRole('link', { name: /^2구간 카카오맵/ });
  expect(decodeURIComponent(outwardLink.getAttribute('href') ?? '')).toBe(
    `https://map.kakao.com/link/by/walk/${demoOrigin.name},${demoOrigin.lat},${demoOrigin.lng}/${destination.name},${destination.lat},${destination.lng}`,
  );
  expect(outwardLink.getAttribute('href')).toContain('%2F');
  expect(outwardLink.getAttribute('href')).toContain('%23');
  expect(decodeURIComponent(returningLink.getAttribute('href') ?? '')).toBe(
    `https://map.kakao.com/link/by/traffic/${destination.name},${destination.lat},${destination.lng}/${demoOrigin.name},${demoOrigin.lat},${demoOrigin.lng}`,
  );
  expect(screen.getByRole('link', { name: /^3구간 카카오맵/ }).getAttribute('href')).toContain(
    '/link/from/',
  );
  expect(outwardLink.getAttribute('target')).toBe('_blank');
  expect(outwardLink.getAttribute('rel')).toBe('noopener noreferrer');
  await user.click(outwardLink);
  expect(onFocusRoute).not.toHaveBeenCalled();
  expect(screen.getByRole('region', { name: '구간별 이동 안내' })).toBeTruthy();
});

it('가상 장소의 예시 동선에는 외부 길찾기 링크를 표시하지 않는다', () => {
  const destination = { ...demoOrigin, id: 'destination', name: '가상 장소', lat: 37.55 };
  render(
    withQueries(
      <RouteSummary
        origin={demoOrigin}
        destination={null}
        onEdit={vi.fn()}
        onFocusRoute={vi.fn()}
        initiallyExpanded
        itinerary={{
          demo: true,
          places: [destination],
          legs: [createDemoLeg(demoOrigin, destination)],
        }}
      />,
    ),
  );
  expect(screen.queryByRole('link', { name: /카카오맵에서 보기/ })).toBeNull();
});
