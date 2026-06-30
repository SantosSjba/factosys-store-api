import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Pool } from 'pg';
import { Logger } from 'winston';
import { PrismaClient } from '../generated/prisma/client';
import type { Prisma } from '../generated/prisma/client';
import { createDatabasePool } from '../shared/helpers/create-database-pool.helper';
import {
  getDatabaseConnectionMessage,
  getDatabaseHostLabel,
} from '../shared/helpers/database-connection.helper';

type TransactionOptions = {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
};

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    const connectionString = configService.get<string>('database.url', '');
    const pool = createDatabasePool({
      connectionString,
      max: configService.get<number>('timeouts.dbPoolMax', 10),
      connectionTimeoutMillis: configService.get<number>(
        'timeouts.dbConnectionMs',
        10_000,
      ),
      idleTimeoutMillis: configService.get<number>(
        'timeouts.dbPoolIdleMs',
        30_000,
      ),
      statementTimeoutMs: configService.get<number>(
        'timeouts.dbStatementMs',
        60_000,
      ),
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  private get defaultTransactionOptions(): TransactionOptions {
    return {
      maxWait: this.configService.get<number>(
        'timeouts.dbTransactionMaxWaitMs',
        15_000,
      ),
      timeout: this.configService.get<number>(
        'timeouts.dbTransactionTimeoutMs',
        60_000,
      ),
    };
  }

  runTransaction<R>(
    handler: (tx: Prisma.TransactionClient) => Promise<R>,
    options?: TransactionOptions,
  ): Promise<R> {
    return this.$transaction(handler, {
      ...this.defaultTransactionOptions,
      ...options,
    });
  }

  runBatchTransaction(
    operations: Prisma.PrismaPromise<unknown>[],
    options?: TransactionOptions,
  ) {
    return this.$transaction(operations, {
      ...this.defaultTransactionOptions,
      ...options,
    });
  }

  async onModuleInit(): Promise<void> {
    const connectionString = this.configService.get<string>('database.url');

    if (!connectionString) {
      this.logConnectionFailure(
        'No se pudo conectar a la base de datos: falta DATABASE_URL en el archivo .env.',
      );
      return;
    }

    const hostLabel = getDatabaseHostLabel(connectionString);

    try {
      await this.$connect();
      this.logger.info(`Base de datos conectada correctamente (${hostLabel})`);
    } catch (error) {
      const message = getDatabaseConnectionMessage(error);
      this.logConnectionFailure(`${message} Destino: ${hostLabel}.`, error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
    this.logger.info('Conexión a la base de datos cerrada');
  }

  private logConnectionFailure(message: string, error?: unknown): void {
    this.logger.error(message);

    if (error instanceof Error && error.message) {
      this.logger.error(`Detalle: ${error.message}`);
    }

    this.logger.error(
      'Sugerencia: inicia PostgreSQL con `docker compose up -d postgres` y verifica DATABASE_URL en tu .env',
    );

    process.exit(1);
  }
}
