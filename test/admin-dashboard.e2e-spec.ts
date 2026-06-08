import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp } from './create-e2e-app';

describe('Admin dashboard (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    app = await createE2eApp();
  });

  it('/api/admin/dashboard/stats (GET) requiere autenticación', () => {
    return request(app.getHttpServer())
      .get('/api/admin/dashboard/stats')
      .expect(401);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});
