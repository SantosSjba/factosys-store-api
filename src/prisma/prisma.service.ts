import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PrismaClient } from '../generated/prisma/client';
import {
  getDatabaseConnectionMessage,
  getDatabaseHostLabel,
} from '../shared/helpers/database-connection.helper';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    const connectionString = configService.get<string>('database.url', '');
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
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
