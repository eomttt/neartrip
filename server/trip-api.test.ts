import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import { createTestServer } from './test-server';
import { demoOrigin, demoPlaces } from './demo';
import { itinerarySchema, placeSchema } from '../src/domains/trip/models/model-trip';
import { z } from 'zod';

let server: Server;
let baseUrl: string;
beforeAll(async () => {
  vi.stubEnv('DEMO_MODE', 'true');
  await new Promise<void>((resolve, reject) => {
    server = createTestServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('테스트 서버 주소 없음');
  baseUrl = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  vi.unstubAllEnvs();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

describe('여행 API', () => {
  it('예시 모드임을 명시한다', async () => {
    const response = await fetch(`${baseUrl}/api/config`);
    expect(await response.json()).toMatchObject({ demo: true });
  });
  it('검색어가 맞지 않으면 빈 목록을 반환한다', async () => {
    const response = await fetch(`${baseUrl}/api/search?q=없는장소`);
    expect(await response.json()).toEqual([]);
  });
  it('카페 필터와 반경을 함께 적용한다', async () => {
    const response = await fetch(
      `${baseUrl}/api/nearby?lat=37.54458&lng=127.05598&category=cafe&radius=500`,
    );
    const places = z.array(placeSchema).parse(await response.json());
    expect(places.length).toBeGreaterThan(0);
    expect(places.every((place) => place.category === 'cafe')).toBe(true);
  });
  it('출발점으로 돌아오고, 수동 방문 순서를 유지한다', async () => {
    const places = demoPlaces.slice(0, 3).toReversed();
    const response = await fetch(`${baseUrl}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: demoOrigin, places, order: 'manual' }),
    });
    const itinerary = itinerarySchema.parse(await response.json());
    expect(itinerary.places.map((place) => place.id)).toEqual(places.map((place) => place.id));
    expect(itinerary.legs).toHaveLength(4);
    expect(itinerary.legs[0]?.from.id).toBe(demoOrigin.id);
    expect(itinerary.legs.at(-1)?.to.id).toBe(demoOrigin.id);
    expect(itinerary.demo).toBe(true);
  });
  it('도착점은 방문지 5곳과 별도로 받고 그곳에서 동선을 끝낸다', async () => {
    const places = demoPlaces.slice(0, 5).toReversed();
    const destination = demoPlaces[5];
    const response = await fetch(`${baseUrl}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: demoOrigin, destination, places, order: 'manual' }),
    });
    expect(response.status).toBe(200);
    const itinerary = itinerarySchema.parse(await response.json());
    expect(itinerary.places).toEqual(places);
    expect(itinerary.legs).toHaveLength(6);
    expect(itinerary.legs[0]?.from.id).toBe(demoOrigin.id);
    expect(itinerary.legs.at(-1)?.to.id).toBe(destination?.id);
    expect(itinerary.legs.some((leg) => leg.to.id === demoOrigin.id)).toBe(false);
  });
  it('방문지가 없어도 출발점에서 도착점으로 바로 간다', async () => {
    const destination = demoPlaces[0];
    const response = await fetch(`${baseUrl}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: demoOrigin, destination, places: [], order: 'manual' }),
    });
    expect(response.status).toBe(200);
    const itinerary = itinerarySchema.parse(await response.json());
    expect(itinerary.places).toEqual([]);
    expect(itinerary.legs).toHaveLength(1);
    expect(itinerary.legs[0]?.from.id).toBe(demoOrigin.id);
    expect(itinerary.legs[0]?.to.id).toBe(destination?.id);
  });
  it('도착점을 지워 null로 보내면 출발점으로 돌아온다', async () => {
    const response = await fetch(`${baseUrl}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: demoOrigin,
        destination: null,
        places: demoPlaces.slice(0, 1),
        order: 'manual',
      }),
    });
    const itinerary = itinerarySchema.parse(await response.json());
    expect(itinerary.legs).toHaveLength(2);
    expect(itinerary.legs.at(-1)?.to.id).toBe(demoOrigin.id);
  });
  it.each([
    { destination: null, places: [] },
    { destination: demoPlaces[0], places: demoPlaces.slice(0, 1) },
  ])('빈 동선과 도착점 중복 방문을 거부한다: %j', async (body) => {
    const response = await fetch(`${baseUrl}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: demoOrigin, ...body }),
    });
    expect(response.status).toBe(400);
  });
  it('국내 범위 밖 좌표와 중복 장소를 거부한다', async () => {
    const coordinateResponse = await fetch(`${baseUrl}/api/nearby?lat=91&lng=127&radius=500`);
    expect(coordinateResponse.status).toBe(400);
    const response = await fetch(`${baseUrl}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: demoOrigin, places: [demoOrigin] }),
    });
    expect(response.status).toBe(400);
  });
});
