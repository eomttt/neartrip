import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // 기존 1Password 마운트는 키를 복사하지 않고 이름만 호환합니다.
  env: {
    NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY:
      process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY || process.env.VITE_KAKAO_JAVASCRIPT_KEY || '',
  },
};

export default nextConfig;
