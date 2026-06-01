import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { DomainException } from '../exceptions/domain.exception';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();

    response.status(HttpStatus.BAD_REQUEST).json({
      code: exception.code,
      message: exception.message,
      details: exception.details ?? null,
    });
  }
}
