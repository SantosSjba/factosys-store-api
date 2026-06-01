import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  name: process.env.APP_NAME ?? 'factosys-store-api',
  env: process.env.NODE_ENV ?? 'development',
  url: process.env.APP_URL ?? 'http://localhost:3000',
  port: Number(process.env.APP_PORT ?? 3000),
  apiPrefix: process.env.API_PREFIX ?? 'api',
}));
