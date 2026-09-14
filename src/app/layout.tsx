import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@/common/design-system/shadcn.css';
import '@/common/design-system/global.css';
import { QueryProvider } from '@/common/react-query/components/QueryProvider';

const title = '가까이 · neartrip | 오늘, 어디 가지?';
const description =
  '숙소 근처의 맛집·카페·가볼 만한 곳·술집을 골라 오늘의 여행 동선을 만들어보세요. 출발지부터 방문 순서와 이동 경로까지 한눈에 확인할 수 있어요.';
const shareImage = {
  url: '/og-neartrip-v1.jpg',
  width: 1200,
  height: 630,
  alt: '가까이 neartrip — 오늘, 어디 가지? 숙소와 카페, 맛집과 산책길을 잇는 초록색 여행 동선',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://neartrip-one.vercel.app'),
  title,
  description,
  applicationName: '가까이 · neartrip',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: '/',
    siteName: '가까이 · neartrip',
    title,
    description,
    images: [shareImage],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [shareImage],
  },
  icons: { icon: '/favicon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#245d46' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
