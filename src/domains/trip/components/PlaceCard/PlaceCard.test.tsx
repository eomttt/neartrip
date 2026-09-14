// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PlaceCard } from '.';
import { demoOrigin } from '../../../../../server/demo';

afterEach(cleanup);

it('카카오 장소 상세 페이지를 HTTPS 새 창 링크로 제공한다', () => {
  render(
    <PlaceCard
      place={{ ...demoOrigin, name: '확인할 장소', url: 'http://place.map.kakao.com/12345' }}
      origin={demoOrigin}
      isSelected={false}
      isDisabled={false}
      onSelect={vi.fn()}
    />,
  );
  const link = screen.getByRole('link', { name: '확인할 장소 카카오맵 후기·상세 (새 창)' });
  expect(link.getAttribute('href')).toBe('https://place.map.kakao.com/12345');
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.getAttribute('rel')).toContain('noopener');
  expect(screen.getByText(demoOrigin.address)).toBeTruthy();
});

it.each(['', 'javascript:alert(1)', 'https://example.com/12345'])(
  '상세 주소가 없거나 카카오 장소 주소가 아니면 링크를 표시하지 않는다: %s',
  (url) => {
    render(
      <PlaceCard
        place={{ ...demoOrigin, url }}
        origin={demoOrigin}
        isSelected={false}
        isDisabled={false}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.queryByRole('link')).toBeNull();
  },
);

it('동반 정보를 확인한 장소 카드에 표시하고 조건과 출처를 함께 제공한다', () => {
  render(
    <PlaceCard
      place={{ ...demoOrigin, tourism: { kind: 'pet', conditions: '소형견 · 목줄 착용' } }}
      origin={demoOrigin}
      isSelected={false}
      isDisabled={false}
      onSelect={vi.fn()}
    />,
  );
  expect(screen.getByText('반려견 동반')).toBeTruthy();
  expect(screen.getByText('반려견 동반 조건').closest('details')).toBeTruthy();
  expect(screen.getByText('소형견 · 목줄 착용')).toBeTruthy();
});

it('술집 장소를 술 한잔 카테고리로 표시한다', () => {
  render(
    <PlaceCard
      place={{ ...demoOrigin, category: 'bar', name: '저녁의 잔' }}
      origin={demoOrigin}
      isSelected={false}
      isDisabled={false}
      onSelect={vi.fn()}
    />,
  );
  expect(screen.getByText('술 한잔')).toBeTruthy();
});
