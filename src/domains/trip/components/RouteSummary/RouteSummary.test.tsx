// @vitest-environment jsdom
import { renderWithI18n } from '@/common/i18n/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { cleanup, screen } from '@testing-library/react';
import { RouteSummary } from '.';
import { demoOrigin, createDemoLeg } from '../../../../../server/demo';

afterEach(cleanup);

it.each([true, false])(
  '차량 구간은 자동차 길찾기로 연결하고 정거장을 표시하지 않는다: %s',
  (hasRoute) => {
    const destination = { ...demoOrigin, id: 'destination', name: '도착 장소', lat: 37.59 };
    const leg = createDemoLeg(demoOrigin, destination, 'driving');
    renderWithI18n(
      withQueries(
        <RouteSummary
          origin={demoOrigin}
          destination={destination}
          itinerary={{
            demo: false,
            places: [],
            legs: [
              {
                ...leg,
                segments: hasRoute ? leg.segments : [],
                warning: hasRoute ? null : '차량 경로 없음',
              },
            ],
          }}
          onEdit={vi.fn()}
          onFocusRoute={vi.fn()}
        />,
      ),
    );
    expect(screen.getByRole('link', { name: /^1구간 카카오맵/ }).getAttribute('href')).toContain(
      '/link/by/car/',
    );
    const google = new URL(
      screen.getByRole('link', { name: /^1구간 Google/ }).getAttribute('href') ?? '',
    );
    expect(google.searchParams.get('travelmode')).toBe('driving');
    expect(screen.queryByText(/정거장/)).toBeNull();
  },
);

function withQueries(children: React.ReactNode) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

it('주의 구간에서도 경고와 이동 안내, 합산 시간을 함께 보여준다', () => {
  const destination = { ...demoOrigin, id: 'destination', name: '도착 장소', lat: 37.55 };
  const leg = createDemoLeg(demoOrigin, destination);
  renderWithI18n(
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

it('구간을 각각 접고 펼쳐도 목록과 다른 구간 및 지도 선택은 유지한다', async () => {
  const user = userEvent.setup();
  const destination = { ...demoOrigin, id: 'destination', name: '도착 장소', lat: 37.55 };
  const leg = createDemoLeg(demoOrigin, destination);
  const props = {
    destination: null,
    origin: demoOrigin,
    itinerary: {
      demo: false,
      places: [destination],
      legs: [leg, createDemoLeg(destination, demoOrigin)],
    },
    onEdit: vi.fn(),
    onFocusRoute: vi.fn(),
  };
  const { rerender } = renderWithI18n(withQueries(<RouteSummary {...props} />));
  expect(screen.queryByRole('button', { name: '구간별 이동 보기' })).toBeNull();
  const region = screen.getByRole('region', { name: '구간별 이동 안내' });
  expect(region.tabIndex).toBe(0);
  const toggle = screen.getByRole('button', { name: '1구간 접기' });
  const controlled = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
  expect(controlled?.hidden).toBe(false);
  toggle.focus();
  await user.keyboard('{Enter}');
  expect(screen.getByRole('button', { name: '1구간 펼치기' }).getAttribute('aria-expanded')).toBe(
    'false',
  );
  expect(controlled?.hidden).toBe(true);
  expect(screen.getByRole('button', { name: '2구간 접기' }).getAttribute('aria-expanded')).toBe(
    'true',
  );
  expect(screen.queryByRole('link', { name: /^1구간 카카오맵/ })).toBeNull();
  expect(screen.getByRole('link', { name: /^2구간 카카오맵/ })).toBeTruthy();
  expect(props.onFocusRoute).not.toHaveBeenCalled();
  await user.keyboard(' ');
  expect(controlled?.hidden).toBe(false);
  await user.click(screen.getByRole('button', { name: '1구간 접기' }));
  await user.click(screen.getByRole('button', { name: /^1\. .* 지도에서 보기$/ }));
  expect(props.onFocusRoute).toHaveBeenCalledWith(0, null);
  rerender(
    withQueries(
      <RouteSummary
        {...props}
        itinerary={{ ...props.itinerary, legs: [{ ...leg, warning: '도보 20분을 넘어요.' }] }}
      />,
    ),
  );
  expect(screen.getByRole('button', { name: '1구간 접기' }).getAttribute('aria-expanded')).toBe(
    'true',
  );
  await user.click(screen.getByRole('button', { name: '1구간 접기' }));
  expect(screen.getByText('도보 20분을 넘어요.').closest('[hidden]')).toBeNull();
  expect(screen.getByRole('region', { name: '구간별 이동 안내' })).toBeTruthy();
});

it('각 구간의 방향과 이동수단에 맞는 카카오맵과 Google Maps 링크를 제공한다', async () => {
  const user = userEvent.setup();
  const destination = { ...demoOrigin, id: 'destination', name: '카페 / 쉼, #1', lat: 37.55 };
  const outward = createDemoLeg(demoOrigin, destination);
  const returning = createDemoLeg(destination, demoOrigin);
  const onFocusRoute = vi.fn();
  renderWithI18n(
    withQueries(
      <RouteSummary
        origin={demoOrigin}
        destination={null}
        onEdit={vi.fn()}
        onFocusRoute={onFocusRoute}
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
  const outwardGoogleLink = screen.getByRole('link', { name: /^1구간 Google Maps/ });
  const returningGoogleLink = screen.getByRole('link', { name: /^2구간 Google Maps/ });
  const warningGoogleLink = screen.getByRole('link', { name: /^3구간 Google Maps/ });
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
  const outwardGoogleUrl = new URL(outwardGoogleLink.getAttribute('href') ?? '');
  expect(outwardGoogleUrl.origin + outwardGoogleUrl.pathname).toBe(
    'https://www.google.com/maps/dir/',
  );
  expect(outwardGoogleUrl.searchParams.get('api')).toBe('1');
  expect(outwardGoogleUrl.searchParams.get('origin')).toBe(`${demoOrigin.lat},${demoOrigin.lng}`);
  expect(outwardGoogleUrl.searchParams.get('destination')).toBe(
    `${destination.lat},${destination.lng}`,
  );
  expect(outwardGoogleUrl.searchParams.get('travelmode')).toBe('walking');
  expect(
    new URL(returningGoogleLink.getAttribute('href') ?? '').searchParams.get('travelmode'),
  ).toBe('transit');
  expect(new URL(warningGoogleLink.getAttribute('href') ?? '').searchParams.has('travelmode')).toBe(
    false,
  );
  expect(outwardLink.getAttribute('target')).toBe('_blank');
  expect(outwardLink.getAttribute('rel')).toBe('noopener noreferrer');
  expect(outwardGoogleLink.getAttribute('target')).toBe('_blank');
  expect(outwardGoogleLink.getAttribute('rel')).toBe('noopener noreferrer');
  await user.click(outwardLink);
  expect(onFocusRoute).not.toHaveBeenCalled();
  expect(screen.getByRole('region', { name: '구간별 이동 안내' })).toBeTruthy();
});

it('가상 장소의 예시 동선에는 외부 길찾기 링크를 표시하지 않는다', () => {
  const destination = { ...demoOrigin, id: 'destination', name: '가상 장소', lat: 37.55 };
  renderWithI18n(
    withQueries(
      <RouteSummary
        origin={demoOrigin}
        destination={null}
        onEdit={vi.fn()}
        onFocusRoute={vi.fn()}
        itinerary={{
          demo: true,
          places: [destination],
          legs: [createDemoLeg(demoOrigin, destination)],
        }}
      />,
    ),
  );
  expect(screen.queryByRole('link', { name: /카카오맵에서 보기/ })).toBeNull();
  expect(screen.queryByRole('link', { name: /Google Maps에서 보기/ })).toBeNull();
});
