import request from 'supertest';
import { createTestApp, TestContext } from './create-app';

describe('Health (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('GET /api/health returns the service and database status', async () => {
    const response = await request(ctx.app.getHttpServer())
      .get('/api/health')
      .expect(200);

    const body = response.body as {
      status: string;
      database: string;
      uptime: number;
      timestamp: string;
    };

    expect(body).toMatchObject({ status: 'ok', database: 'up' });
    expect(typeof body.uptime).toBe('number');
    expect(Date.parse(body.timestamp)).not.toBeNaN();
  });

  it('returns 404 for an unknown route', async () => {
    await request(ctx.app.getHttpServer())
      .get('/api/does-not-exist')
      .expect(404);
  });
});
