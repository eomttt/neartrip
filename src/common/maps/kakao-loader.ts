let loading: Promise<void> | undefined;

export function loadKakaoMap(key: string): Promise<void> {
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
    script.async = true;
    const timeout = window.setTimeout(
      () => reject(new Error('지도를 불러오지 못했어요. 키와 허용 도메인을 확인해주세요.')),
      12_000,
    );
    script.onload = () => {
      if (typeof kakao === 'undefined') {
        window.clearTimeout(timeout);
        reject(new Error('카카오 지도 설정을 확인해주세요.'));
        return;
      }
      kakao.maps.load(() => {
        window.clearTimeout(timeout);
        resolve();
      });
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error('지도에 연결하지 못했어요. 네트워크를 확인해주세요.'));
    };
    document.head.appendChild(script);
  });
  return loading;
}
