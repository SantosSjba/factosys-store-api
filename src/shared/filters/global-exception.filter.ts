import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { resolveApplicationError } from '../helpers/error-message.helper';
import { ErrorResponseBody } from '../types/error-response.types';

@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: ConfigService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      this.logger.error('Error no HTTP capturado', {
        error: exception instanceof Error ? exception.message : exception,
      });
      return;
    }

    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<{ method: string; url: string }>();
    const resolved = resolveApplicationError(exception);
    const isProduction =
      this.configService.get<string>('app.env', 'development') === 'production';

    const body: ErrorResponseBody = {
      statusCode: resolved.statusCode,
      code: resolved.code,
      message: resolved.message,
      details: resolved.details ?? null,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (resolved.statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${resolved.statusCode} ${resolved.message}`,
        {
          code: resolved.code,
          ...(exception instanceof Error && !isProduction
            ? { stack: exception.stack }
            : {}),
        },
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} -> ${resolved.statusCode} ${resolved.message}`,
        { code: resolved.code, details: resolved.details ?? null },
      );
    }

    response.status(resolved.statusCode).json(body);
  }
}
