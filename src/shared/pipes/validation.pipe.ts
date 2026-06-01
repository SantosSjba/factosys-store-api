import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { flattenValidationErrors } from '../helpers/validation-error.helper';

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    exceptionFactory: (errors) =>
      new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados no son válidos.',
        details: flattenValidationErrors(errors),
      }),
  });
}
