import concurrently from 'concurrently';
import dotenv from 'dotenv';

// 1Password의 FIFO 마운트는 두 프로세스가 동시에 읽으면 한쪽이 빈 값을 받을 수 있습니다.
dotenv.config({ path: ['.env.local', '.env'], quiet: true });
process.env.NEARTRIP_ENV_LOADED = 'true';

const { result } = concurrently(
  [
    { command: 'tsx watch server/index.ts', name: 'api' },
    { command: 'vite --host 127.0.0.1', name: 'web' },
  ],
  { killOthersOn: ['success', 'failure'] },
);

result.catch(() => {
  process.exitCode = 1;
});
