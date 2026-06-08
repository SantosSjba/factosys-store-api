import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  buildRedisOptions,
  type RedisConnectionConfig,
} from '../../config/redis.config';
import { REDIS_CLIENT } from './redis.constants';

const logger = new Logger('RedisClient');

function createRedisClient(config: RedisConnectionConfig): Redis | null {
  if (process.env.REDIS_ENABLED === 'false') {
    logger.warn('Redis deshabilitado (REDIS_ENABLED=false)');
    return null;
  }

  const options = buildRedisOptions(config, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy: (attempt) => {
      if (attempt > 5) return null;
      return Math.min(attempt * 500, 3000);
    },
  });

  const client =
    typeof options === 'string'
      ? new Redis(options, {
          lazyConnect: true,
          enableOfflineQueue: false,
          maxRetriesPerRequest: null,
          retryStrategy: (attempt) => {
            if (attempt > 5) return null;
            return Math.min(attempt * 500, 3000);
          },
        })
      : new Redis(options);

  let lastErrorLog = 0;
  client.on('error', (error) => {
    const now = Date.now();
    if (now - lastErrorLog < 30_000) return;
    lastErrorLog = now;
    logger.warn(
      `Sin conexión a Redis (${config.host}:${config.port}). ` +
        'Levanta el servicio con: docker compose up redis -d',
    );
    if (process.env.NODE_ENV === 'development') {
      logger.debug(error.message);
    }
  });

  return client;
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const config = configService.get<RedisConnectionConfig>('redis');
        if (!config) {
          throw new Error('Configuración Redis no disponible');
        }
        return createRedisClient(config);
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisInfrastructureModule {}
