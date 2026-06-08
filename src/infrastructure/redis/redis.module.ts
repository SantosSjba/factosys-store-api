import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  buildRedisOptions,
  type RedisConnectionConfig,
} from '../../config/redis.config';
import { REDIS_CLIENT } from './redis.constants';

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

        const options = buildRedisOptions(config, {
          maxRetriesPerRequest: null,
          enableReadyCheck: true,
        });

        return typeof options === 'string' ? new Redis(options) : new Redis(options);
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisInfrastructureModule {}
