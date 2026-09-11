// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { KakaoMap } from '.';
import { demoOrigin } from '../../../../../server/demo';

vi.mock('../../../../common/maps/kakao-loader', () => ({
  loadKakaoMap: vi.fn().mockResolvedValue(undefined),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('목록을 펼쳐 지도 크기가 바뀌어도 현재 중심과 확대 수준을 유지한다', async () => {
  let resize: (() => void) | undefined;
  const center = { lat: 37.56, lng: 127.08 };
  const getCenter = vi.fn().mockReturnValue(center);
  const relayout = vi.fn();
  const setCenter = vi.fn();
  const setBounds = vi.fn();
  const setLevel = vi.fn();
  const getLevel = vi.fn().mockReturnValue(4);
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
        setMap() {}
      },
    },
  });
  render(
    <KakaoMap origin={demoOrigin} places={[]} selected={[]} itinerary={null} onSelect={vi.fn()} />,
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
});
