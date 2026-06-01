import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Observable, tap } from 'rxjs';
import { Logger } from 'winston';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      method: string;
      originalUrl: string;
      ip?: string;
    }>();
    const { method, originalUrl } = request;
    const ip = request.ip ?? '-';
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<{ statusCode: number }>();
          this.logRequest(method, originalUrl, response.statusCode, startedAt, ip);
        },
        error: (error: { status?: number; message?: string }) => {
          const status = error.status ?? 500;
          this.logRequest(method, originalUrl, status, startedAt, ip, error.message);
        },
      }),
    );
  }

  private logRequest(
    method: string,
    url: string,
    statusCode: number,
    startedAt: number,
    ip: string,
    errorMessage?: string,
  ): void {
    const durationMs = Date.now() - startedAt;
    const message = `${method} ${url} ${statusCode} ${durationMs}ms ip=${ip}`;

    if (statusCode >= 500) {
      this.logger.error(message, errorMessage ? { error: errorMessage } : undefined);
      return;
    }

    if (statusCode >= 400) {
      this.logger.warn(message, errorMessage ? { error: errorMessage } : undefined);
      return;
    }

    this.logger.info(message);
  }
}
