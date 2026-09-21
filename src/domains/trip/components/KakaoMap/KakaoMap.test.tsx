// @vitest-environment jsdom
import { renderWithI18n } from '@/common/i18n/test-utils';
import { act, cleanup, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { KakaoMap } from '.';
import { demoOrigin, demoPlaces } from '../../../../../server/demo';

vi.mock('../../../../common/maps/kakao-loader', () => ({
  loadKakaoMap: vi.fn().mockResolvedValue(undefined),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('지도 크기가 바뀌거나 장소를 담아도 현재 확대 상태를 유지한다', async () => {
  const place = demoPlaces[0];
  if (!place) throw new Error('예시 장소 없음');
  let resize: (() => void) | undefined;
  const center = { lat: 37.56, lng: 127.08 };
  const getCenter = vi.fn().mockReturnValue(center);
  const relayout = vi.fn();
  const setCenter = vi.fn();
  const setBounds = vi.fn();
  const setLevel = vi.fn();
  const getLevel = vi.fn().mockReturnValue(4);
  const overlayContents: HTMLElement[] = [];
  vi.stubEnv('NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY', 'test-only-key');
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('kakao', {
    maps: {
      Map: class {
        getCenter = getCenter;
        relayout = relayout;
        setCenter = setCenter;
        setBounds = setBounds;
        setLevel = setLevel;
        getLevel = getLevel;
      },
      LatLng: class {
        constructor(
          public lat: number,
          public lng: number,
        ) {}
      },
      LatLngBounds: class {
        extend() {}
        isEmpty() {
          return false;
        }
      },
      CustomOverlay: class {
        constructor({ content }: { content: HTMLElement }) {
          overlayContents.push(content);
        }
        setMap() {}
      },
    },
  });
  const onShowEntireRoute = vi.fn();
  const onSelect = vi.fn();
  const { rerender } = renderWithI18n(
    <KakaoMap
      origin={demoOrigin}
      places={[place]}
      selected={[]}
      itinerary={null}
      onShowEntireRoute={onShowEntireRoute}
      onSelect={onSelect}
    />,
  );
  await waitFor(() => expect(resize).toBeDefined());
  expect(setBounds).toHaveBeenCalled();
  setBounds.mockClear();
  act(() => resize?.());
  expect(relayout).toHaveBeenCalledOnce();
  expect(setCenter).toHaveBeenLastCalledWith(center);
  expect(getCenter.mock.invocationCallOrder[0]).toBeLessThan(
    relayout.mock.invocationCallOrder[0] ?? 0,
  );
  expect(setBounds).not.toHaveBeenCalled();
  expect(setLevel).toHaveBeenLastCalledWith(4, { animate: false, anchor: center });
  const pannedCenter = { lat: 37.57, lng: 127.09 };
  getCenter.mockReturnValue(pannedCenter);
  act(() => resize?.());
  expect(setCenter).toHaveBeenLastCalledWith(pannedCenter);
  expect(setBounds).not.toHaveBeenCalled();
  rerender(
    <KakaoMap
      origin={demoOrigin}
      places={[place]}
      selected={[place]}
      itinerary={null}
      onShowEntireRoute={onShowEntireRoute}
      onSelect={onSelect}
    />,
  );
  expect(setBounds).not.toHaveBeenCalled();
  const selectedPin = overlayContents
    .flatMap((content) => [...content.querySelectorAll('button')])
    .find((pin) => pin.getAttribute('aria-label') === `${place.name} 지도에서 빼기`);
  if (!selectedPin) throw new Error('선택된 장소 마커 없음');
  expect(selectedPin.getAttribute('aria-pressed')).toBe('true');
  act(() => selectedPin.click());
  expect(onSelect).toHaveBeenCalledWith(place);
});
