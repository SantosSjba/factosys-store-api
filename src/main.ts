import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';
import {
  logBootstrapFailure,
  registerProcessErrorHandlers,
} from './shared/helpers/process-error.helper';
import { createValidationPipe } from './shared/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);
  registerProcessErrorHandlers(logger);

  const configService = app.get(ConfigService, { strict: false });
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');
  const appPort = configService.get<number>('app.port', 3000);

  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(createValidationPipe());

  setupSwagger(app, configService);

  await app.listen(appPort);

  logger.log(`Servidor listo en http://localhost:${appPort}/${apiPrefix}`);
}

bootstrap().catch((error: unknown) => {
  logBootstrapFailure(error);
  process.exit(1);
});
