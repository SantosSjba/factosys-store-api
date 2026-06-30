import { HttpStatus } from '@nestjs/common';
import { ResolvedApplicationError } from '../types/error-response.types';

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;

  const direct = readString('code' in error ? error.code : undefined);
  if (direct) return direct;

  if ('errors' in error && Array.isArray(error.errors)) {
    for (const nested of error.errors) {
      const nestedCode = readErrorCode(nested);
      if (nestedCode) return nestedCode;
    }
  }

  return undefined;
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '';
}

function isTimeoutLike(error: unknown): boolean {
  const code = readErrorCode(error);
  const message = readErrorMessage(error);
  const name =
    error && typeof error === 'object' && 'name' in error
      ? String(error.name)
      : '';

  return (
    code === 'ETIMEDOUT' ||
    code === 'ECONNABORTED' ||
    code === 'P2024' ||
    code === '57014' ||
    name === 'TimeoutError' ||
    /timeout/i.test(message) ||
    /timed out/i.test(message)
  );
}

function isConnectionLike(error: unknown): boolean {
  const code = readErrorCode(error);
  const message = readErrorMessage(error);

  return (
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'ENOTFOUND' ||
    code === 'EHOSTUNREACH' ||
    code === 'P1001' ||
    code === 'P1002' ||
    code === 'P1017' ||
    /connect/i.test(message)
  );
}

export function resolveInfrastructureError(
  error: unknown,
): ResolvedApplicationError | null {
  if (!(error instanceof Error) && typeof error !== 'object') {
    return null;
  }

  if (isTimeoutLike(error)) {
    return {
      statusCode: HttpStatus.GATEWAY_TIMEOUT,
      code: 'REQUEST_TIMEOUT',
      message:
        'La operación tardó demasiado. Intenta de nuevo en unos momentos.',
      details:
        process.env.NODE_ENV === 'development'
          ? readErrorMessage(error)
          : undefined,
    };
  }

  if (isConnectionLike(error)) {
    return {
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'SERVICE_UNAVAILABLE',
      message:
        'Un servicio interno no respondió a tiempo. Intenta de nuevo en unos momentos.',
      details:
        process.env.NODE_ENV === 'development'
          ? readErrorMessage(error)
          : undefined,
    };
  }

  return null;
}
