// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Server } from 'node:http';
import { createApp } from '../../../server/app';
import { TripPage } from '.';

const nativeFetch = globalThis.fetch;
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  vi.stubEnv('DEMO_MODE', 'true');
  await new Promise<void>((resolve, reject) => {
    server = createApp().listen(0, '127.0.0.1', (error) => (error ? reject(error) : resolve()));
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

async function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={client}>
      <TripPage />
    </QueryClientProvider>,
  );
  await screen.findByRole('button', { name: '작은 식탁 담기' });
  return user;
}

describe('여행 화면과 예시 API 연결', () => {
  it('이용 방법 안에서 포커스를 유지하고 Escape로 닫으면 열기 버튼으로 돌아간다', async () => {
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

  it('검색 반경을 바꾸면 목록을 갱신하고 담아둔 장소는 유지한다', async () => {
    const user = await setup();
    await user.click(screen.getByRole('button', { name: '초록 산책길 담기' }));
    await user.selectOptions(screen.getByRole('combobox', { name: '검색 반경' }), '500');
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '초록 산책길 빼기' })).toBeNull(),
    );
    expect(screen.getByRole('button', { name: '초록 산책길 일정에서 빼기' })).toBeTruthy();
    await user.selectOptions(screen.getByRole('combobox', { name: '검색 반경' }), '1000');
    expect(await screen.findByRole('button', { name: '초록 산책길 빼기' })).toBeTruthy();
  });

  it('종류를 필터링하고, 선택한 장소의 왕복 동선을 만든다', async () => {
    const user = await setup();
    await user.click(
      within(screen.getByRole('group', { name: '장소 종류' })).getByRole('button', {
        name: '카페',
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '작은 식탁 담기' })).toBeNull(),
    );
    await user.click(await screen.findByRole('button', { name: '오후의 커피 담기' }));
    await user.click(screen.getByRole('button', { name: '온기 베이커리 담기' }));
    await user.click(screen.getByRole('button', { name: '가까운 순서로 동선 짜기' }));
    await screen.findByText('예시 동선을 만들었어요');
    expect(screen.getByText('돌아오기')).toBeTruthy();
    expect(screen.getByText('점선은 예시 방문 순서예요.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '오후의 커피 일정에서 빼기' }));
    expect(screen.queryByText('예시 동선을 만들었어요')).toBeNull();
  });

  it('방문 순서를 바꾸고 수동 순서로 계산한다', async () => {
    const user = await setup();
    await user.click(screen.getByRole('button', { name: '작은 식탁 담기' }));
    await user.click(screen.getByRole('button', { name: '오후의 커피 담기' }));
    await user.click(screen.getByRole('button', { name: '오후의 커피 앞으로' }));
    const stops = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(stops[0]?.textContent).toContain('오후의 커피');
    await user.click(screen.getByRole('button', { name: '내가 담은 순서대로 길찾기' }));
    await screen.findByText('예시 동선을 만들었어요');
    expect(screen.getByText('1. 성수역 → 오후의 커피')).toBeTruthy();
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
    await user.type(screen.getByLabelText('출발 장소 검색'), '작은 식탁');
    await user.click(screen.getByRole('button', { name: '장소 검색' }));
    const results = await screen.findByRole('region', { name: '출발 장소 검색 결과' });
    await user.click(await within(results).findByRole('button', { name: /작은 식탁/ }));
    expect(screen.getByText('마음이 가는 곳을 담아보세요.')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: '가까운 순서로 동선 짜기' }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('검색 결과가 없는 경우를 안내한다', async () => {
    const user = await setup();
    await user.type(screen.getByLabelText('출발 장소 검색'), '없는장소');
    await user.click(screen.getByRole('button', { name: '장소 검색' }));
    expect(await screen.findByText(/검색 결과가 없어요/)).toBeTruthy();
  });
});
