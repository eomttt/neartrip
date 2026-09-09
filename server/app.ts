import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { categorySchema, planRequestSchema } from '../src/domains/trip/models/model-trip';
import { orderRoundTrip } from '../src/domains/trip/utils/route-order';
import { createDemoLeg, demoOrigin, demoPlaces, nearbyDemo } from './demo';
import { getLeg, nearbyPlaces, ProviderError, searchPlaces } from './kakao';

export function createApp() {
  const app = express();
  const demo =
    process.env.DEMO_MODE === 'true' ||
    (!process.env.KAKAO_REST_API_KEY && !process.env.VITE_KAKAO_JAVASCRIPT_KEY);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '20kb' }));
  app.use('/api', (_request, response, next) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 60,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
    }),
  );
  app.get('/api/config', (_request, response) =>
    response.json({
      demo,
      configured: Boolean(process.env.KAKAO_REST_API_KEY && process.env.VITE_KAKAO_JAVASCRIPT_KEY),
      demoOrigin,
    }),
  );
  app.get('/api/search', async (request, response) => {
    const query = z.string().trim().min(1).max(80).parse(request.query.q);
    const places = demo
      ? [demoOrigin, ...demoPlaces].filter((place) =>
          `${place.name} ${place.address}`.includes(query),
        )
      : await searchPlaces(query);
    response.json(places);
  });
  app.get('/api/nearby', async (request, response) => {
    const { lat, lng, category, radius } = z
      .object({
        lat: z.coerce.number().min(32).max(39.5),
        lng: z.coerce.number().min(124).max(132),
        category: categorySchema.optional(),
        radius: z.coerce.number().int().min(300).max(3_000),
      })
      .parse(request.query);
    const categories = category ? [category] : categorySchema.options;
    const places = demo
      ? nearbyDemo({ ...demoOrigin, lat, lng }, category, radius)
      : (
          await Promise.all(categories.map((value) => nearbyPlaces({ lat, lng }, value, radius)))
        ).flat();
    response.json(places);
  });
  app.post('/api/plan', async (request, response) => {
    const { origin, places, order } = planRequestSchema.parse(request.body);
    const ordered = order === 'nearby' ? orderRoundTrip(origin, places) : places;
    const points = [origin, ...ordered, origin];
    const pairs = points.slice(1).flatMap((to, index) => {
      const from = points[index];
      return from ? [{ from, to }] : [];
    });
    const legs = [];
    // 경로 조회는 한 번에 세 구간으로 제한해 외부 API의 순간 호출량을 줄입니다.
    for (let index = 0; index < pairs.length; index += 3) {
      legs.push(
        ...(await Promise.all(
          pairs
            .slice(index, index + 3)
            .map(({ from, to }) => (demo ? createDemoLeg(from, to) : getLeg(from, to))),
        )),
      );
    }
    response.json({ places: ordered, legs, demo });
  });
  app.use('/api', (_request, response) =>
    response.status(404).json({ error: '없는 API 경로입니다.' }),
  );
  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof z.ZodError)
        return response
          .status(400)
          .json({ error: '요청 또는 지도 응답의 형식이 올바르지 않습니다.' });
      if (error instanceof ProviderError)
        return response.status(error.status).json({ error: error.message });
      if (error instanceof SyntaxError)
        return response.status(400).json({ error: '요청 내용을 읽을 수 없습니다.' });
      return response.status(500).json({ error: '요청을 완료하지 못했습니다. 다시 시도해주세요.' });
    },
  );
  return app;
}
