import './common/design-system/shadcn.css';
import './common/design-system/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TripPage } from './pages/TripPage';

const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
const root = document.getElementById('root');
if (!root) throw new Error('앱을 표시할 요소가 없습니다.');
createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <TripPage />
    </QueryClientProvider>
  </StrictMode>,
);
