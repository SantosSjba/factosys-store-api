import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// Misma resolución que @nestjs/swagger: assets locales, sin CDN.

const swaggerUiDistPath: string = require('swagger-ui-dist/absolute-path.js')();

export function setupSwagger(
  app: INestApplication,
  configService: ConfigService,
): string | undefined {
  const enabled = configService.get<boolean>('SWAGGER_ENABLED', true);

  if (!enabled) {
    return undefined;
  }

  const config = new DocumentBuilder()
    .setTitle('Factosys Store API')
    .setDescription(
      'API oficial de Factosys Store para administración y e-commerce. ' +
        'Consulta GET /health para verificar el estado de la API y sus servicios.',
    )
    .setVersion('1.0.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
    .build();
  const document = SwaggerModule.createDocument(app, config);

  const swaggerPath = 'docs';

  SwaggerModule.setup(swaggerPath, app, document, {
    customSwaggerUiPath: swaggerUiDistPath,
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Factosys Store API',
  });

  return swaggerPath;
}
