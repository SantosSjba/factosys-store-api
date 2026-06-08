import { registerAs } from '@nestjs/config';
import type { RedisOptions } from 'ioredis';

export type RedisConnectionConfig = {
  url?: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
};

export const redisConfig = registerAs(
  'redis',
  (): RedisConnectionConfig => ({
    url: process.env.REDIS_URL || undefined,
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    username: process.env.REDIS_USER || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
  }),
);

export function buildRedisOptions(
  config: RedisConnectionConfig,
  overrides: RedisOptions = {},
): RedisOptions | string {
  if (config.url) {
    return config.url;
  }

  return {
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    ...overrides,
  };
}
