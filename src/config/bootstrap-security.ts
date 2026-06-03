import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

export function applySecurityMiddleware(
  app: INestApplication,
  configService: ConfigService,
): void {
  const isProduction =
    configService.get<string>('app.env', 'development') === 'production';

  if (isProduction) {
    app.use(helmet());
  }

  // Desarrollo: sin Helmet (evita HSTS en localhost y CSP que rompe Swagger en Safari).
  app.use(compression());
  app.use(cookieParser());

  const origins = configService.get<string[]>('cors.origins', []);

  app.enableCors({
    origin: origins.length > 0 ? origins : true,
    credentials: configService.get<boolean>('cors.credentials', true),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
}
