import {
  CallHandler,
  ExecutionContext,
  GatewayTimeoutException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, TimeoutError, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class RequestTimeoutInterceptor implements NestInterceptor {
  constructor(private readonly configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const timeoutMs = this.configService.get<number>(
      'timeouts.httpRequestMs',
      120_000,
    );

    return next.handle().pipe(
      timeout(timeoutMs),
      catchError((error: unknown) => {
        if (error instanceof TimeoutError) {
          return throwError(
            () =>
              new GatewayTimeoutException({
                code: 'REQUEST_TIMEOUT',
                message:
                  'La operación tardó demasiado. Intenta de nuevo en unos momentos.',
              }),
          );
        }

        return throwError(() => error);
      }),
    );
  }
}
