import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Pool } from 'pg';
import { Logger } from 'winston';
import {
  getDatabaseConnectionMessage,
  getDatabaseHostLabel,
} from '../shared/helpers/database-connection.helper';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async onModuleInit(): Promise<void> {
    const connectionString = this.configService.get<string>('database.url');

    if (!connectionString) {
      this.logConnectionFailure(
        'No se pudo conectar a la base de datos: falta la variable DATABASE_URL en el archivo .env.',
      );
      return;
    }

    const hostLabel = getDatabaseHostLabel(connectionString);
    this.pool = new Pool({ connectionString });

    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      this.logger.info(`Base de datos conectada correctamente (${hostLabel})`);
    } catch (error) {
      const message = getDatabaseConnectionMessage(error);
      this.logConnectionFailure(
        `${message} Destino: ${hostLabel}.`,
        error,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.pool.end();
    this.pool = null;
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

    void this.pool?.end().finally(() => {
      process.exit(1);
    });
  }
}
