import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import Redis from 'ioredis';
import {
  buildRedisOptions,
  type RedisConnectionConfig,
} from '../../config/redis.config';
import { Pool } from 'pg';
import {
  HealthResponseDto,
  HealthStatus,
  TechnologyHealthDto,
  TechnologyHealthStatus,
} from './dto/health-response.dto';

const CHECK_TIMEOUT_MS = 3000;
const API_VERSION = '0.0.1';

@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService) {}

  async getHealthStatus(): Promise<HealthResponseDto> {
    const technologies = await Promise.all([
      this.checkPostgreSQL(),
      this.checkRedis(),
      this.checkElasticsearch(),
      this.checkConfiguredService('prisma', 'Prisma ORM', 'database.url'),
      this.checkConfiguredService('bullmq', 'BullMQ (Colas)', 'redis.host'),
      this.checkConfiguredService('s3', 'AWS S3', 'storage.bucketName'),
      this.checkConfiguredService('mail', 'Correo SMTP', 'mail.host'),
      this.checkSwagger(),
    ]);

    return {
      status: this.resolveOverallStatus(technologies),
      api: {
        status: 'up',
        name: this.configService.get<string>('app.name', 'factosys-store-api'),
        version: API_VERSION,
        environment: this.configService.get<string>('app.env', 'development'),
        uptimeSeconds: Math.floor(process.uptime()),
      },
      technologies,
      timestamp: new Date().toISOString(),
    };
  }

  private resolveOverallStatus(
    technologies: TechnologyHealthDto[],
  ): HealthStatus {
    const pinged = technologies.filter(
      (tech) => tech.status !== TechnologyHealthStatus.CONFIGURED,
    );

    if (pinged.length === 0) {
      return HealthStatus.OK;
    }

    const upCount = pinged.filter(
      (tech) => tech.status === TechnologyHealthStatus.UP,
    ).length;

    if (upCount === pinged.length) {
      return HealthStatus.OK;
    }

    if (upCount === 0) {
      return HealthStatus.ERROR;
    }

    return HealthStatus.DEGRADED;
  }

  private async checkPostgreSQL(): Promise<TechnologyHealthDto> {
    const connectionString = this.configService.get<string>('database.url');

    if (!connectionString) {
      return this.down('postgresql', 'PostgreSQL', 'DATABASE_URL no configurada');
    }

    const pool = new Pool({
      connectionString,
      connectionTimeoutMillis: CHECK_TIMEOUT_MS,
    });

    const startedAt = Date.now();

    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();

      return {
        key: 'postgresql',
        name: 'PostgreSQL',
        status: TechnologyHealthStatus.UP,
        responseTimeMs: Date.now() - startedAt,
        message: 'Conexión establecida correctamente',
      };
    } catch (error) {
      return this.down(
        'postgresql',
        'PostgreSQL',
        error instanceof Error ? error.message : 'No se pudo conectar',
        Date.now() - startedAt,
      );
    } finally {
      await pool.end().catch(() => undefined);
    }
  }

  private async checkRedis(): Promise<TechnologyHealthDto> {
    const config = this.configService.get<RedisConnectionConfig>('redis');

    if (!config?.url && !config?.host) {
      return this.down('redis', 'Redis', 'REDIS_HOST no configurado');
    }

    const redisOptions = buildRedisOptions(config, {
      connectTimeout: CHECK_TIMEOUT_MS,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });

    const redis =
      typeof redisOptions === 'string'
        ? new Redis(redisOptions, { lazyConnect: true })
        : new Redis(redisOptions);

    redis.on('error', () => undefined);

    const startedAt = Date.now();

    try {
      await redis.connect();
      const pong = await redis.ping();
      await redis.quit();

      if (pong !== 'PONG') {
        return this.down('redis', 'Redis', 'Respuesta inesperada del servidor Redis');
      }

      return {
        key: 'redis',
        name: 'Redis',
        status: TechnologyHealthStatus.UP,
        responseTimeMs: Date.now() - startedAt,
        message: 'Conexión establecida correctamente',
      };
    } catch (error) {
      await redis.quit().catch(() => undefined);

      return this.down(
        'redis',
        'Redis',
        error instanceof Error ? error.message : 'No se pudo conectar',
        Date.now() - startedAt,
      );
    }
  }

  private async checkElasticsearch(): Promise<TechnologyHealthDto> {
    const node = this.configService.get<string>('elasticsearch.node');

    if (!node) {
      return this.down(
        'elasticsearch',
        'Elasticsearch',
        'ELASTICSEARCH_NODE no configurado',
      );
    }

    const client = new ElasticsearchClient({
      node,
      requestTimeout: CHECK_TIMEOUT_MS,
    });

    const startedAt = Date.now();

    try {
      await client.ping();

      return {
        key: 'elasticsearch',
        name: 'Elasticsearch',
        status: TechnologyHealthStatus.UP,
        responseTimeMs: Date.now() - startedAt,
        message: 'Conexión establecida correctamente',
      };
    } catch (error) {
      return this.down(
        'elasticsearch',
        'Elasticsearch',
        error instanceof Error ? error.message : 'No se pudo conectar',
        Date.now() - startedAt,
      );
    }
  }

  private checkConfiguredService(
    key: string,
    name: string,
    configKey: string,
  ): TechnologyHealthDto {
    const value = this.configService.get<string>(configKey);

    if (!value) {
      return {
        key,
        name,
        status: TechnologyHealthStatus.DOWN,
        message: 'No configurado',
      };
    }

    return {
      key,
      name,
      status: TechnologyHealthStatus.CONFIGURED,
      message: 'Configurado en variables de entorno',
    };
  }

  private checkSwagger(): TechnologyHealthDto {
    const enabled = this.configService.get<boolean>('SWAGGER_ENABLED', true);

    return {
      key: 'swagger',
      name: 'Swagger / OpenAPI',
      status: enabled
        ? TechnologyHealthStatus.CONFIGURED
        : TechnologyHealthStatus.DOWN,
      message: enabled ? 'Documentación habilitada en /docs' : 'Documentación deshabilitada',
    };
  }

  private down(
    key: string,
    name: string,
    message: string,
    responseTimeMs?: number,
  ): TechnologyHealthDto {
    return {
      key,
      name,
      status: TechnologyHealthStatus.DOWN,
      responseTimeMs,
      message,
    };
  }
}
