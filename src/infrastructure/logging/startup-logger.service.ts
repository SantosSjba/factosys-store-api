import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class StartupLoggerService implements OnApplicationBootstrap {
  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  onApplicationBootstrap(): void {
    const env = this.configService.get<string>('app.env', 'development');
    const port = this.configService.get<number>('app.port', 3000);
    const apiPrefix = this.configService.get<string>('app.apiPrefix', 'api');
    const appUrl = this.configService.get<string>(
      'app.url',
      'http://localhost:3000',
    );

    this.logger.info(`Environment: ${env}`);
    this.logger.info(`API listening on port ${port} (prefix: /${apiPrefix})`);
    this.logger.info(`App URL: ${appUrl}`);
    this.logger.info('HTTP request logging enabled');
  }
}
