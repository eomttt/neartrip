// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Server } from 'node:http';
import { createTestServer } from '../../../../server/test-server';
import { demoOrigin } from '../../../../server/demo';
import { TripPage } from '.';

const nativeFetch = globalThis.fetch;
let server: Server;
let baseUrl: string;
let testClient = 0;
beforeEach(() => {
  testClient += 1;
});

beforeAll(async () => {
  vi.stubEnv('DEMO_MODE', 'true');
  vi.stubEnv('VERCEL', '1');
  await new Promise<void>((resolve, reject) => {
    server = createTestServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('테스트 서버 주소 없음');
  baseUrl = `http://127.0.0.1:${address.port}`;
  vi.stubGlobal('fetch', (input: string | URL | Request, init?: RequestInit) =>
    nativeFetch(typeof input === 'string' ? new URL(input, baseUrl) : input, {
      ...init,
      headers: {
        ...Object.fromEntries(new Headers(init?.headers)),
        'x-forwarded-for': `test-client-${testClient}`,
      },
    }),
  );
});

afterEach(cleanup);
afterAll(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

async function setup(hasOrigin = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={client}>
      <TripPage />
    </QueryClientProvider>,
  );
  if (hasOrigin) await screen.findByRole('button', { name: '작은 식탁 담기' });
  else await screen.findByRole('textbox', { name: '출발 장소 검색' });
  return user;
}

async function editPlaces(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('button', {
      name: screen.queryByRole('region', { name: '이동 안내' })
        ? '장소·순서 수정'
        : '1단계 출발·도착·주변 선택',
    }),
  );
}

async function openSelected(user: ReturnType<typeof userEvent.setup>) {
  if (!screen.queryByRole('button', { name: '비우기' })) {
    await user.click(screen.getByText(/담은 장소 \d \/ 5/));
  }
}

async function openNearbyFilters(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /장소 필터/ }));
  return screen.getByRole('dialog', { name: '장소 필터' });
}

async function closeNearbyFilters(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    within(screen.getByRole('dialog', { name: '장소 필터' })).getByRole('button', {
      name: '장소 보기',
    }),
  );
}

async function build(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^순서대로 동선 짜기/ }));
  await screen.findByRole('button', { name: '지도 넓게 보기' });
  expect(screen.getByRole('button', { name: '2단계 동선 보기' }).getAttribute('aria-current')).toBe(
    'step',
  );
}

async function showDetails(user: ReturnType<typeof userEvent.setup>) {
  const showButton = screen.queryByRole('button', { name: '이동 안내 보기' });
  if (showButton) await user.click(showButton);
  expect(screen.getByRole('region', { name: '구간별 이동 안내' })).toBeTruthy();
}

async function chooseDestination(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('button', { name: '출발·도착점 수정' }));
  await user.click(screen.getByRole('button', { name: /도착점 추가|도착점 변경/ }));
  await user.type(screen.getByLabelText('도착 장소 검색'), name);
  await user.click(screen.getByRole('button', { name: '도착점 검색' }));
  await user.click(
    await within(screen.getByRole('region', { name: '도착점 검색 결과' })).findByRole('button', {
      name: new RegExp(name),
    }),
  );
  await user.click(screen.getByRole('button', { name: '장소 둘러보기' }));
}

describe('두 단계 여행 화면과 예시 API 연결', () => {
  it('혼잡도 조회가 실패해도 장소를 담고 동선을 만들 수 있다', async () => {
    const currentFetch = globalThis.fetch;
    const crowdedFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).endsWith('/api/crowding'))
        return Response.json({ error: '조회 지연' }, { status: 503 });
      return currentFetch(input, init);
    });
    try {
      const user = await setup();
      await waitFor(() =>
        expect(
          crowdedFetch.mock.calls.some(([input]) => String(input).endsWith('/api/crowding')),
        ).toBe(true),
      );
      expect(screen.queryByText('주변 혼잡도 확인 지연')).toBeNull();
      await user.click(screen.getByRole('button', { name: '작은 식탁 담기' }));
      await build(user);
    } finally {
      crowdedFetch.mockRestore();
    }
  });
  it('반려견 정보가 503이어도 주변 장소를 담고 동선을 만들 수 있다', async () => {
    const currentFetch = globalThis.fetch;
    const petFetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).includes('/api/discover?mode=pet'))
        return Response.json({ error: '관광정보 이용 불가' }, { status: 503 });
      return currentFetch(input, init);
    });
    try {
      const user = await setup();
      await waitFor(() =>
        expect(petFetch.mock.calls.some(([input]) => String(input).includes('mode=pet'))).toBe(
          true,
        ),
      );
      expect(screen.queryByText('관광정보 이용 불가')).toBeNull();
      await user.click(screen.getByRole('button', { name: '작은 식탁 담기' }));
      await build(user);
    } finally {
      petFetch.mockRestore();
    }
  });
  it('행사와 반려견 필터를 바꿔도 담은 장소를 유지하고 동선을 만든다', async () => {
    const user = await setup();
    let filters = await openNearbyFilters(user);
    await user.click(within(filters).getByRole('button', { name: '이번 주 행사' }));
    await closeNearbyFilters(user);
    const events = await screen.findAllByRole('button', { name: /동네 행사 예시 담기/ });
    const event = events[0];
    if (!event) throw new Error('행사 예시 없음');
    await user.click(event);
    filters = await openNearbyFilters(user);
    expect(within(filters).getByRole('group', { name: '카테고리 복수 선택' })).toBeTruthy();
    await user.click(within(filters).getByRole('button', { name: '반려견 동반' }));
    await closeNearbyFilters(user);
    const pets = await screen.findAllByRole('button', { name: /반려견 동반 예시 담기/ });
    const pet = pets[0];
    if (!pet) throw new Error('반려견 예시 없음');
    await user.click(pet);
    expect(screen.getByRole('button', { name: /장소 필터 \d+개 적용/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /담은 장소 2 \/ 5/ })).toBeTruthy();
    await build(user);
  });

  it('카테고리를 복수 선택하고 조건 필터를 함께 적용한다', async () => {
    const user = await setup();
    const list = screen.getByRole('region', { name: '주변 장소 목록' });
    expect(within(list).getByRole('button', { name: '작은 식탁 담기' })).toBeTruthy();
    expect(screen.queryByRole('group', { name: '카테고리 복수 선택' })).toBeNull();
    const filterTrigger = screen.getByRole('button', { name: '장소 필터' });
    const filters = await openNearbyFilters(user);
    await user.click(within(filters).getByRole('button', { name: '맛집' }));
    expect(list.textContent).toContain('작은 식탁');
    expect(filterTrigger.getAttribute('aria-label')).toBe('장소 필터');
    expect(within(filters).getByRole('button', { name: '카페' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(
      within(filters).getByRole('button', { name: '갈 만한 곳' }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      within(filters).getByRole('button', { name: '술 한잔' }).getAttribute('aria-pressed'),
    ).toBe('true');
    await user.click(within(filters).getByRole('button', { name: '반려견 동반' }));
    await closeNearbyFilters(user);
    expect(within(list).queryByRole('button', { name: '작은 식탁 담기' })).toBeNull();
    expect(await within(list).findAllByText('반려견 동반')).not.toHaveLength(0);
  });

  it('필터 시트를 닫으면 변경을 버리고 다시 열 때 적용된 조건을 보여준다', async () => {
    const user = await setup();
    const list = screen.getByRole('region', { name: '주변 장소 목록' });
    let filters = await openNearbyFilters(user);
    await user.click(within(filters).getByRole('button', { name: '맛집' }));
    expect(list.textContent).toContain('작은 식탁');
    await user.click(within(filters).getByRole('button', { name: '닫기' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '장소 필터' })).toBeNull());
    expect(within(list).getByRole('button', { name: '작은 식탁 담기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '장소 필터' })).toBeTruthy();

    filters = await openNearbyFilters(user);
    expect(within(filters).getByRole('button', { name: '맛집' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    await user.click(within(filters).getByRole('button', { name: '맛집' }));
    await closeNearbyFilters(user);
    expect(within(list).queryByRole('button', { name: '작은 식탁 담기' })).toBeNull();
    expect(screen.getByRole('button', { name: '장소 필터 1개 적용' })).toBeTruthy();
  });
  it('출발지를 먼저 선택해야 주변 목록을 보여주고 요약으로 포커스를 옮긴다', async () => {
    const currentFetch = globalThis.fetch;
    const liveConfig = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (String(input).endsWith('/api/config')) {
        return Response.json({ demo: false, configured: true, demoOrigin });
      }
      return currentFetch(input, init);
    });
    try {
      const user = await setup(false);
      expect(screen.queryByRole('region', { name: '주변 장소 목록' })).toBeNull();
      expect(screen.queryByRole('button', { name: /순서대로 동선 짜기/ })).toBeNull();
      await user.type(screen.getByLabelText('출발 장소 검색'), '성수역');
      await user.click(screen.getByRole('button', { name: '장소 검색' }));
      await user.click(
        await within(await screen.findByRole('region', { name: '출발 장소 검색 결과' })).findByRole(
          'button',
          { name: /성수역/ },
        ),
      );
      await screen.findByRole('button', { name: '작은 식탁 담기' });
      expect(screen.queryByRole('textbox', { name: '출발 장소 검색' })).toBeNull();
      const summary = screen.getByRole('button', { name: '출발·도착점 수정' });
      await waitFor(() => expect(document.activeElement).toBe(summary));
      await user.click(summary);
      const sheet = screen.getByRole('dialog', { name: '출발·도착점 수정' });
      expect(sheet.contains(document.activeElement)).toBe(true);
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      expect(document.activeElement).toBe(summary);
    } finally {
      liveConfig.mockRestore();
    }
  });

  it('첫 단계에서 모두 선택하고 동선을 만든 뒤 돌아와도 선택을 유지한다', async () => {
    const user = await setup();
    expect(
      within(screen.getByRole('navigation', { name: '여행 단계' })).getAllByRole('button'),
    ).toHaveLength(2);
    expect(screen.getByRole('button', { name: '출발·도착점 수정' })).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: '출발 장소 검색' })).toBeNull();
    expect(screen.getByRole('button', { name: '2단계 동선 보기' }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(screen.queryByRole('region', { name: '여행 지도' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '작은 식탁 담기' }));
    await build(user);
    expect(screen.queryByRole('textbox', { name: '출발 장소 검색' })).toBeNull();
    expect(screen.getByRole('region', { name: '여행 지도' })).toBeTruthy();
    await editPlaces(user);
    expect(
      screen.getByRole('button', { name: '작은 식탁 빼기' }).getAttribute('aria-pressed'),
    ).toBe('true');
    await user.click(screen.getByRole('button', { name: '2단계 동선 보기' }));
    expect(screen.getByRole('region', { name: '여행 지도' })).toBeTruthy();
  });

  it('지도에서 담은 장소를 다시 누르면 목록에서 빼고 동선을 다시 만든다', async () => {
    const user = await setup();
    await user.click(screen.getByRole('button', { name: '작은 식탁 담기' }));
    await user.click(screen.getByRole('button', { name: '오후의 커피 담기' }));
    await build(user);
    const selectedPin = screen.getByRole('button', { name: '작은 식탁 지도에서 빼기' });
    expect(selectedPin.getAttribute('aria-pressed')).toBe('true');
    await user.click(selectedPin);
    expect(screen.getByRole('region', { name: '여행 지도' }).getAttribute('data-active')).toBe(
      'true',
    );
    expect(screen.getByRole('button', { name: '작은 식탁 지도에서 선택' })).toBeTruthy();
    const pendingPlaces = screen.getByRole('list', { name: '현재 담은 장소' });
    expect(within(pendingPlaces).queryByText('작은 식탁')).toBeNull();
    expect(within(pendingPlaces).getByText('오후의 커피')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '변경한 장소로 동선 다시 짜기' }));
    await screen.findByRole('button', { name: '지도 넓게 보기' });
  });

  it('지도에서 마지막 장소를 빼면 다른 장소를 고를 수 있다', async () => {
    const user = await setup();
    await user.click(screen.getByRole('button', { name: '작은 식탁 담기' }));
    await build(user);
    await user.click(screen.getByRole('button', { name: '작은 식탁 지도에서 빼기' }));
    await user.click(screen.getByRole('button', { name: '다른 장소 고르기' }));
    expect(
      screen
        .getByRole('button', { name: '1단계 출발·도착·주변 선택' })
        .getAttribute('aria-current'),
    ).toBe('step');
    expect(screen.getByRole('button', { name: '작은 식탁 담기' })).toBeTruthy();
  });

  it('지도 장소에 호버하면 카드 정보를 보여주고 선택해도 지도에 머문다', async () => {
    const user = await setup();
    await user.click(screen.getByRole('button', { name: '작은 식탁 담기' }));
    await build(user);
    const map = screen.getByRole('region', { name: '여행 지도' });
    expect(map.getAttribute('data-route-details')).toBe('true');
    const pin = screen.getByRole('button', { name: '오후의 커피 지도에서 선택' });
    await user.hover(pin);
    const preview = screen.getByRole('tooltip', { name: '오후의 커피 장소 정보' });
    expect(within(preview).getByText('카페')).toBeTruthy();
    expect(within(preview).getByText('성수동 예시 골목 2')).toBeTruthy();
    expect(within(preview).getByText(/^직선 /)).toBeTruthy();
    await user.click(pin);
    expect(map.getAttribute('data-active')).toBe('true');
    expect(map.getAttribute('data-route-details')).toBe('true');
    expect(screen.getByText('장소가 바뀌었어요')).toBeTruthy();
    expect(
      within(screen.getByRole('list', { name: '현재 담은 장소' })).getByText('오후의 커피'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: '오후의 커피 지도에서 빼기' })).toBeTruthy();
  });

  it('동선 보기에서 필터를 바꾸고 지도 마커로 장소를 더 담는다', async () => {
    const user = await setup();
    await user.click(screen.getByRole('button', { name: '작은 식탁 담기' }));
    await build(user);
    expect(screen.getByRole('button', { name: '모퉁이 소반 지도에서 선택' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /장소 필터 \d+곳/ }));
    const dialog = screen.getByRole('dialog', { name: '지도에 표시할 장소' });
    await user.click(within(dialog).getByRole('button', { name: '맛집' }));
    await user.click(within(dialog).getByRole('button', { name: '지도에서 보기' }));
    expect(screen.getByRole('region', { name: '여행 지도' }).getAttribute('data-active')).toBe(
      'true',
    );
    expect(screen.queryByRole('button', { name: '모퉁이 소반 지도에서 선택' })).toBeNull();
    const cafe = screen.getByRole('button', { name: '오후의 커피 지도에서 선택' });
    await user.click(cafe);
    expect(screen.getByRole('button', { name: '오후의 커피 지도에서 빼기' })).toBeTruthy();
    expect(screen.getByRole('region', { name: '여행 지도' }).getAttribute('data-active')).toBe(
      'true',
    );
    await user.click(screen.getByRole('button', { name: '변경한 장소로 동선 다시 짜기' }));
    await screen.findByRole('button', { name: '지도 넓게 보기' });
    expect(screen.getByRole('region', { name: '여행 지도' }).getAttribute('data-active')).toBe(
      'true',
    );
  });

  it('이용 방법 안에서 포커스를 유지하고 닫으면 열기 버튼으로 돌아간다', async () => {
    const user = await setup();
    const trigger = screen.getByRole('button', { name: '이용 방법' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: '장소 하나에서 시작하는 작은 여행' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(trigger);
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: '여행 시작하기' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it('카테고리와 반경 필터를 바꿔도 담은 장소는 유지한다', async () => {
    const user = await setup();
    await user.click(screen.getByRole('button', { name: '초록 산책길 담기' }));
    let filters = await openNearbyFilters(user);
    await user.selectOptions(within(filters).getByRole('combobox', { name: '검색 반경' }), '500');
    await closeNearbyFilters(user);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '초록 산책길 빼기' })).toBeNull(),
    );
    expect(screen.getByText(/담은 장소 1 \/ 5/)).toBeTruthy();
    filters = await openNearbyFilters(user);
    const categories = within(filters).getByRole('group', { name: '카테고리 복수 선택' });
    await user.click(within(categories).getByRole('button', { name: '맛집' }));
    await user.click(within(categories).getByRole('button', { name: '갈 만한 곳' }));
    await closeNearbyFilters(user);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '작은 식탁 담기' })).toBeNull(),
    );
    await user.click(await screen.findByRole('button', { name: '오후의 커피 담기' }));
    await build(user);
    await showDetails(user);
    expect(screen.getByText('3. 오후의 커피 → 성수역')).toBeTruthy();
  });

  it('첫 화면에서 방문 순서를 바꾸면 그 순서대로 왕복 동선을 만든다', async () => {
    const user = await setup();
    for (const name of ['작은 식탁', '오후의 커피', '초록 산책길']) {
      await user.click(screen.getByRole('button', { name: `${name} 담기` }));
    }
    await openSelected(user);
    await user.click(screen.getByRole('button', { name: '오후의 커피 앞으로' }));
    await user.click(screen.getByRole('button', { name: '순서 선택 완료' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement?.textContent).toMatch(/담은 장소 3/);
    await build(user);
    await showDetails(user);
    for (const leg of [
      '1. 성수역 → 오후의 커피',
      '2. 오후의 커피 → 작은 식탁',
      '3. 작은 식탁 → 초록 산책길',
      '4. 초록 산책길 → 성수역',
    ]) {
      expect(screen.getByText(leg)).toBeTruthy();
    }
    await user.click(screen.getByRole('button', { name: '장소·순서 수정' }));
    await openSelected(user);
    const stops = within(screen.getByRole('dialog', { name: '방문 순서 변경' })).getAllByRole(
      'listitem',
    );
    expect(stops[0]?.textContent).toContain('오후의 커피');
  });

  it('도착점을 선택·변경·삭제하면 마지막 구간과 지도 표시가 바뀐다', async () => {
    const user = await setup();
    await user.click(screen.getByRole('button', { name: '작은 식탁 담기' }));
    await user.click(screen.getByRole('button', { name: '오후의 커피 담기' }));
    await chooseDestination(user, '오후의 커피');
    expect(screen.getByText(/담은 장소 1 \/ 5/)).toBeTruthy();
    await build(user);
    expect(screen.getByRole('button', { name: '오후의 커피 도착점' })).toBeTruthy();
    await showDetails(user);
    expect(screen.getByText('2. 작은 식탁 → 오후의 커피')).toBeTruthy();
    expect(screen.queryByText('3. 오후의 커피 → 성수역')).toBeNull();
    await editPlaces(user);
    await chooseDestination(user, '초록 산책길');
    expect(screen.getByRole('button', { name: '2단계 동선 보기' }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(screen.queryByText('예시 동선을 만들었어요')).toBeNull();
    await build(user);
    expect(screen.queryByRole('button', { name: '오후의 커피 도착점' })).toBeNull();
    expect(screen.getByRole('button', { name: '초록 산책길 도착점' })).toBeTruthy();
    await showDetails(user);
    expect(screen.getByText('2. 작은 식탁 → 초록 산책길')).toBeTruthy();
    await editPlaces(user);
    await user.click(screen.getByRole('button', { name: '출발·도착점 수정' }));
    await user.click(screen.getByRole('button', { name: '도착점 지우기' }));
    await user.click(screen.getByRole('button', { name: '장소 둘러보기' }));
    await build(user);
    expect(screen.queryByRole('button', { name: '초록 산책길 도착점' })).toBeNull();
    await showDetails(user);
    expect(screen.getByText('2. 작은 식탁 → 성수역')).toBeTruthy();
  });

  it('중간 방문지 없이 도착점만 고르고 바로 동선을 만든다', async () => {
    const user = await setup();
    await chooseDestination(user, '온기 베이커리');
    await build(user);
    await showDetails(user);
    expect(screen.getByText('1. 성수역 → 온기 베이커리')).toBeTruthy();
    expect(screen.queryByText('2. 온기 베이커리 → 성수역')).toBeNull();
    await editPlaces(user);
    await user.click(screen.getByRole('button', { name: '출발·도착점 수정' }));
    await user.click(screen.getByRole('button', { name: '도착점 지우기' }));
    await user.click(screen.getByRole('button', { name: '장소 둘러보기' }));
    expect(
      screen.getByRole('button', { name: /^순서대로 동선 짜기/ }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('다섯 곳 제한을 적용하고 출발점을 바꾸면 선택을 비운다', async () => {
    const user = await setup();
    for (const name of [
      '작은 식탁',
      '오후의 커피',
      '초록 산책길',
      '온기 베이커리',
      '골목 파스타',
    ]) {
      await user.click(screen.getByRole('button', { name: `${name} 담기` }));
    }
    expect(screen.getByRole('button', { name: '취향 서점 담기' }).hasAttribute('disabled')).toBe(
      true,
    );
    await user.click(screen.getByRole('button', { name: '출발·도착점 수정' }));
    await user.type(screen.getByLabelText('출발 장소 검색'), '작은 식탁');
    await user.click(screen.getByRole('button', { name: '장소 검색' }));
    await user.click(
      await within(await screen.findByRole('region', { name: '출발 장소 검색 결과' })).findByRole(
        'button',
        { name: /작은 식탁/ },
      ),
    );
    await user.click(screen.getByRole('button', { name: '장소 둘러보기' }));
    expect(screen.queryByRole('region', { name: '담은 장소' })).toBeNull();
    expect(
      screen.getByRole('button', { name: /^순서대로 동선 짜기/ }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('구간·세부 안내를 선택하면 지도에서 강조하고 다시 선택하면 재생을 시작한다', async () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const user = await setup();
    await user.click(screen.getByRole('button', { name: '작은 식탁 담기' }));
    await build(user);
    await showDetails(user);
    const legButton = screen.getByRole('button', { name: '1. 성수역 → 작은 식탁 지도에서 보기' });
    await user.click(legButton);
    const firstHighlight = screen.getByRole('status', { name: '성수역 → 작은 식탁 이동 미리보기' });
    expect(firstHighlight.querySelectorAll('polyline')).toHaveLength(1);
    expect(document.activeElement).toBe(legButton);
    expect(screen.getByRole('region', { name: '구간별 이동 안내' })).toBeTruthy();
    await user.click(legButton);
    expect(screen.getByRole('status', { name: '성수역 → 작은 식탁 이동 미리보기' })).not.toBe(
      firstHighlight,
    );
    const step = screen.getByRole('button', {
      name: '1-1. 예시 이동 · 실제 길찾기가 아닙니다 지도에서 보기',
    });
    step.focus();
    await user.keyboard('{Enter}');
    expect(
      screen.getByRole('status', { name: '예시 이동 · 실제 길찾기가 아닙니다 이동 미리보기' }),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '전체 동선 보기' }));
    expect(screen.queryByRole('status', { name: /이동 미리보기/ })).toBeNull();
    expect(step.getAttribute('aria-pressed')).toBe('false');
    await editPlaces(user);
    await user.click(screen.getByRole('button', { name: '작은 식탁 빼기' }));
    expect(screen.getByRole('button', { name: '2단계 동선 보기' }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(screen.queryByText('예시 동선을 만들었어요')).toBeNull();
  });

  it('지도와 이동 안내를 함께 보여주고 안내를 접으면 지도에 초점을 돌려준다', async () => {
    const user = await setup();
    await user.click(screen.getByRole('button', { name: '작은 식탁 담기' }));
    await build(user);
    const map = screen.getByRole('region', { name: '여행 지도' });
    const sheet = screen.getByRole('region', { name: '이동 안내' });
    expect(map.getAttribute('data-active')).toBe('true');
    expect(map.getAttribute('data-route-details')).toBe('true');
    expect(within(sheet).getByRole('region', { name: '구간별 이동 안내' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '전체 동선 보기' })).toBeTruthy();
    const trigger = screen.getByRole('button', { name: '지도 넓게 보기' });
    await user.click(trigger);
    expect(map.getAttribute('data-route-details')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    await user.click(screen.getByRole('button', { name: '이동 안내 보기' }));
    expect(map.getAttribute('data-route-details')).toBe('true');
    const legButton = within(sheet).getByRole('button', {
      name: '1. 성수역 → 작은 식탁 지도에서 보기',
    });
    await user.click(legButton);
    expect(screen.getByRole('status', { name: '성수역 → 작은 식탁 이동 미리보기' })).toBeTruthy();
    expect(within(sheet).getByRole('region', { name: '구간별 이동 안내' })).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(map.getAttribute('data-route-details')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    expect(screen.getByRole('region', { name: '여행 지도' })).toBe(map);
  });

  it('동선 생성 중 선택을 바꾸면 이전 응답을 버리고 새 선택으로 다시 만든다', async () => {
    const user = await setup();
    await user.click(screen.getByRole('button', { name: '작은 식탁 담기' }));
    const currentFetch = globalThis.fetch;
    let resolvePlan: ((response: Response) => void) | undefined;
    const pending = new Promise<Response>((resolve) => {
      resolvePlan = resolve;
    });
    let firstRequest = true;
    const delayed = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      if (String(input).endsWith('/api/plan') && firstRequest) {
        firstRequest = false;
        return pending;
      }
      return currentFetch(input, init);
    });
    try {
      await user.click(screen.getByRole('button', { name: /^순서대로 동선 짜기/ }));
      await screen.findByRole('button', { name: '길을 찾아보고 있어요' });
      await user.click(screen.getByRole('button', { name: '오후의 커피 담기' }));
      expect(
        screen.getByRole('button', { name: /^순서대로 동선 짜기/ }).hasAttribute('disabled'),
      ).toBe(false);
      await act(async () => {
        if (!resolvePlan) throw new Error('대기 중인 요청이 없습니다.');
        resolvePlan(new Response(JSON.stringify({ demo: true, places: [], legs: [] })));
        await pending;
      });
      expect(screen.getByText(/담은 장소 2 \/ 5/)).toBeTruthy();
      expect(screen.getByRole('button', { name: '2단계 동선 보기' }).hasAttribute('disabled')).toBe(
        true,
      );
      expect(screen.queryByRole('alert')).toBeNull();
      await build(user);
      await showDetails(user);
      expect(screen.getByText('2. 작은 식탁 → 오후의 커피')).toBeTruthy();
    } finally {
      delayed.mockRestore();
    }
  });

  it('검색 결과가 없는 경우를 안내한다', async () => {
    const user = await setup();
    await user.click(screen.getByRole('button', { name: '출발·도착점 수정' }));
    await user.type(screen.getByLabelText('출발 장소 검색'), '없는장소');
    await user.click(screen.getByRole('button', { name: '장소 검색' }));
    expect(await screen.findByText(/검색 결과가 없어요/)).toBeTruthy();
  });

  it('길찾기가 실패하면 첫 단계에서 오류를 보여주고 다시 시도할 수 있다', async () => {
    const user = await setup();
    await user.click(screen.getByRole('button', { name: '작은 식탁 담기' }));
    const currentFetch = globalThis.fetch;
    const failure = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) =>
      String(input).endsWith('/api/plan')
        ? Promise.resolve(
            new Response(JSON.stringify({ error: '길찾기를 잠시 사용할 수 없어요.' }), {
              status: 503,
            }),
          )
        : currentFetch(input, init),
    );
    try {
      await user.click(screen.getByRole('button', { name: /^순서대로 동선 짜기/ }));
      expect((await screen.findByRole('alert')).textContent).toContain(
        '길찾기를 잠시 사용할 수 없어요.',
      );
      expect(
        screen
          .getByRole('button', { name: '1단계 출발·도착·주변 선택' })
          .getAttribute('aria-current'),
      ).toBe('step');
      expect(
        screen.getByRole('button', { name: /^순서대로 동선 짜기/ }).hasAttribute('disabled'),
      ).toBe(false);
    } finally {
      failure.mockRestore();
    }
  });
});
