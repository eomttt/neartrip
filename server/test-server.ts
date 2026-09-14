import { createServer } from 'node:http';
import { GET as config } from '../src/app/api/config/route';
import { GET as search } from '../src/app/api/search/route';
import { GET as nearby } from '../src/app/api/nearby/route';
import { GET as discover } from '../src/app/api/discover/route';
import { POST as crowding } from '../src/app/api/crowding/route';
import { POST as plan } from '../src/app/api/plan/route';

const routes: Record<string, (request: Request) => Promise<Response>> = {
  'GET /api/config': config,
  'GET /api/search': search,
  'GET /api/nearby': nearby,
  'GET /api/discover': discover,
  'POST /api/plan': plan,
  'POST /api/crowding': crowding,
};

export function createTestServer() {
  return createServer(async (incoming, outgoing) => {
    try {
      const url = new URL(incoming.url ?? '/', 'http://localhost');
      const chunks: Buffer[] = [];
      for await (const chunk of incoming)
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers)) {
        if (typeof value === 'string') headers.set(key, value);
        else if (value) headers.set(key, value.join(', '));
      }
      const body = Buffer.concat(chunks).toString();
      const request = new Request(url, {
        method: incoming.method,
        headers,
        ...(body ? { body } : {}),
      });
      const handler = routes[`${incoming.method} ${url.pathname}`];
      const response = handler ? await handler(request) : new Response(null, { status: 404 });
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(await response.text());
    } catch {
      outgoing.writeHead(500);
      outgoing.end();
    }
  });
}
