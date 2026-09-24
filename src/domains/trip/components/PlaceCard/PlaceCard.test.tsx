// @vitest-environment jsdom
import { renderWithI18n } from '@/common/i18n/test-utils';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PlaceCard } from '.';
import { demoOrigin } from '../../../../../server/demo';

afterEach(cleanup);

it('Google 별점과 리뷰 수를 표시하고 별점이 없는 장소에는 점수를 만들지 않는다', () => {
  const props = { origin: demoOrigin, isSelected: false, isDisabled: false, onSelect: vi.fn() };
  const { rerender } = renderWithI18n(
    <PlaceCard {...props} place={{ ...demoOrigin, rating: 4.6, userRatingCount: 1234 }} />,
  );
  expect(screen.getByText('4.6')).toBeTruthy();
  expect(screen.getByText(/리뷰 1,234개/)).toBeTruthy();
  expect(screen.getByLabelText('Google 별점 5점 만점에 4.6점')).toBeTruthy();
  rerender(<PlaceCard {...props} place={demoOrigin} />);
  expect(screen.queryByText('4.6')).toBeNull();
  expect(screen.queryByLabelText(/Google 별점/)).toBeNull();
});

it('장소 상세를 네이버와 Google 지도 HTTPS 새 창 링크로 제공한다', () => {
  renderWithI18n(
    <PlaceCard
      place={{
        ...demoOrigin,
        id: 'google:test-place',
        name: '확인할 장소',
        url: 'https://www.google.com/maps/search/?api=1&query=place&query_place_id=test-place',
      }}
      origin={demoOrigin}
      isSelected={false}
      isDisabled={false}
      onSelect={vi.fn()}
    />,
  );
  const link = screen.getByRole('link', { name: '확인할 장소 Google Maps 후기·상세 (새 창)' });
  expect(link.getAttribute('href')).toBe(
    'https://www.google.com/maps/search/?api=1&query=place&query_place_id=test-place',
  );
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.getAttribute('rel')).toContain('noopener');
  const naverLink = screen.getByRole('link', { name: '확인할 장소 네이버 지도에서 찾기 (새 창)' });
  expect(decodeURIComponent(naverLink.getAttribute('href') ?? '')).toBe(
    `https://map.naver.com/p/search/${demoOrigin.address} 확인할 장소`,
  );
  expect(naverLink.getAttribute('target')).toBe('_blank');
  expect(naverLink.getAttribute('rel')).toContain('noopener');
  expect(screen.getByText(demoOrigin.address)).toBeTruthy();
});

it.each(['', 'javascript:alert(1)', 'https://example.com/12345'])(
  '상세 주소가 없거나 Google 지도 주소가 아니면 링크를 표시하지 않는다: %s',
  (url) => {
    renderWithI18n(
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
  renderWithI18n(
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
  renderWithI18n(
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
