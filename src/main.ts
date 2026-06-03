import { config as loadEnv } from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

loadEnv({ path: `.env.${process.env.NODE_ENV ?? 'development'}` });
loadEnv({ path: '.env' });
import { AppModule } from './app.module';
import { applySecurityMiddleware } from './config/bootstrap-security';
import {
  getDevSwaggerUrls,
  resolveDevHttpsOptions,
} from './config/dev-https.helper';
import { setupSwagger } from './config/swagger.config';
import {
  logBootstrapFailure,
  registerProcessErrorHandlers,
} from './shared/helpers/process-error.helper';
import { createValidationPipe } from './shared/pipes/validation.pipe';

async function bootstrap() {
  const httpsOptions = resolveDevHttpsOptions();
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    ...(httpsOptions ? { httpsOptions } : {}),
  });

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);
  registerProcessErrorHandlers(logger);

  const configService = app.get(ConfigService, { strict: false });
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');
  const appPort = configService.get<number>('app.port', 3000);

  applySecurityMiddleware(app, configService);

  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(createValidationPipe());

  const swaggerPath = setupSwagger(app, configService);

  await app.listen(appPort);

  const protocol = httpsOptions ? 'https' : 'http';
  logger.log(
    `Servidor listo en ${protocol}://127.0.0.1:${appPort}/${apiPrefix}`,
  );

  if (swaggerPath) {
    const { httpUrl, httpsUrl } = getDevSwaggerUrls(appPort, Boolean(httpsOptions));
    if (httpsUrl) {
      logger.log(
        `Swagger (HTTPS, Safari): ${httpsUrl} — acepta el certificado local si el navegador lo pide`,
      );
    } else {
      logger.log(
        `Swagger (HTTP): ${httpUrl} — si Safari muestra error TLS, usa esa URL con http:// o activa DEV_HTTPS=true y ejecuta pnpm certs:dev`,
      );
    }
  }

  if (configService.get<boolean>('google.enabled', false)) {
    logger.log('Google OAuth habilitado en /api/store/auth/google');
  }
}

bootstrap().catch((error: unknown) => {
  logBootstrapFailure(error);
  process.exit(1);
});
