import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@/common/design-system/shadcn.css';
import '@/common/design-system/global.css';
import { QueryProvider } from '@/common/react-query/components/QueryProvider';

export const metadata: Metadata = {
  title: '가까이 — 오늘의 작은 여행',
  description: '숙소 근처의 맛집·카페·가볼 만한 곳을 골라 나만의 하루 동선을 만들어보세요.',
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
