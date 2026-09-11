// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
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

beforeAll(async () => {
  vi.stubEnv('DEMO_MODE', 'true');
  await new Promise<void>((resolve, reject) => {
    server = createTestServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('테스트 서버 주소 없음');
  baseUrl = `http://127.0.0.1:${address.port}`;
  vi.stubGlobal('fetch', (input: string | URL | Request, init?: RequestInit) =>
    nativeFetch(typeof input === 'string' ? new URL(input, baseUrl) : input, init),
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
      name: screen.queryByRole('dialog', { name: '이동 안내' })
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

async function build(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^순서대로 동선 짜기/ }));
  await screen.findByRole('button', { name: '이동 안내 보기' });
  expect(screen.getByRole('button', { name: '2단계 동선 보기' }).getAttribute('aria-current')).toBe(
    'step',
  );
}

async function showDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '이동 안내 보기' }));
  if (!screen.queryByRole('region', { name: '구간별 이동 안내' })) {
    await user.click(screen.getByRole('button', { name: '구간별 이동 보기' }));
  }
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
    await user.selectOptions(screen.getByRole('combobox', { name: '검색 반경' }), '500');
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '초록 산책길 빼기' })).toBeNull(),
    );
    expect(screen.getByText(/담은 장소 1 \/ 5/)).toBeTruthy();
    await user.click(
      within(screen.getByRole('group', { name: '장소 종류' })).getByRole('button', {
        name: '카페',
      }),
    );
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
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '2단계 동선 보기' }));
    await showDetails(user);
    await user.click(screen.getByRole('button', { name: '1. 성수역 → 작은 식탁 지도에서 보기' }));
    expect(screen.getByRole('status', { name: '성수역 → 작은 식탁 이동 미리보기' })).not.toBe(
      firstHighlight,
    );
    await showDetails(user);
    const step = screen.getByRole('button', {
      name: '1-1. 예시 이동 · 실제 길찾기가 아닙니다 지도에서 보기',
    });
    step.focus();
    await user.keyboard('{Enter}');
    expect(
      screen.getByRole('status', { name: '예시 이동 · 실제 길찾기가 아닙니다 이동 미리보기' }),
    ).toBeTruthy();
    await editPlaces(user);
    await user.click(screen.getByRole('button', { name: '작은 식탁 빼기' }));
    expect(screen.getByRole('button', { name: '2단계 동선 보기' }).hasAttribute('disabled')).toBe(
      true,
    );
    expect(screen.queryByText('예시 동선을 만들었어요')).toBeNull();
  });

  it('이동 안내를 지도 위에 열고 닫아도 지도를 유지하고 포커스를 돌려준다', async () => {
    const user = await setup();
    await user.click(screen.getByRole('button', { name: '작은 식탁 담기' }));
    await build(user);
    const map = screen.getByRole('region', { name: '여행 지도' });
    const trigger = screen.getByRole('button', { name: '이동 안내 보기' });
    await user.click(trigger);
    const sheet = screen.getByRole('dialog', { name: '이동 안내' });
    expect(map.getAttribute('data-active')).toBe('true');
    expect(sheet.contains(document.activeElement)).toBe(true);
    expect(within(sheet).getByRole('region', { name: '구간별 이동 안내' })).toBeTruthy();
    await user.tab({ shift: true });
    expect(sheet.contains(document.activeElement)).toBe(true);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(trigger);
    expect(screen.getByRole('region', { name: '여행 지도' })).toBe(map);
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: '닫기' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
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
