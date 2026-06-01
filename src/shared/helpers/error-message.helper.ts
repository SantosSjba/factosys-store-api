import { HttpException, HttpStatus } from '@nestjs/common';
import { DomainException } from '../exceptions/domain.exception';
import { ResolvedApplicationError } from '../types/error-response.types';

const STATUS_CODE_MAP: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
};

const STATUS_MESSAGE_MAP: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'La solicitud no es válida.',
  [HttpStatus.UNAUTHORIZED]: 'No tienes autorización para realizar esta acción.',
  [HttpStatus.FORBIDDEN]: 'No tienes permisos para acceder a este recurso.',
  [HttpStatus.NOT_FOUND]: 'El recurso solicitado no fue encontrado.',
  [HttpStatus.CONFLICT]: 'La solicitud entra en conflicto con el estado actual.',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'No se pudo procesar la solicitud.',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Has realizado demasiadas solicitudes. Intenta más tarde.',
  [HttpStatus.INTERNAL_SERVER_ERROR]:
    'Ocurrió un error inesperado. Intenta nuevamente más tarde.',
};

function getDefaultCode(statusCode: number): string {
  return STATUS_CODE_MAP[statusCode] ?? 'APPLICATION_ERROR';
}

function getDefaultMessage(statusCode: number): string {
  return STATUS_MESSAGE_MAP[statusCode] ?? 'Ocurrió un error en la aplicación.';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function resolveApplicationError(
  exception: unknown,
): ResolvedApplicationError {
  if (exception instanceof DomainException) {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      code: exception.code,
      message: exception.message,
      details: exception.details,
    };
  }

  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    const response = exception.getResponse();

    if (isRecord(response)) {
      const rawMessage = response.message;
      const hasArrayMessage = Array.isArray(rawMessage);

      return {
        statusCode,
        code: String(response.code ?? getDefaultCode(statusCode)),
        message: hasArrayMessage
          ? getDefaultMessage(statusCode)
          : String(rawMessage ?? getDefaultMessage(statusCode)),
        details: response.details ?? (hasArrayMessage ? rawMessage : undefined),
      };
    }

    return {
      statusCode,
      code: getDefaultCode(statusCode),
      message:
        typeof response === 'string' ? response : getDefaultMessage(statusCode),
    };
  }

  if (exception instanceof Error) {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: getDefaultMessage(HttpStatus.INTERNAL_SERVER_ERROR),
      details:
        process.env.NODE_ENV === 'development' ? exception.message : undefined,
    };
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'INTERNAL_SERVER_ERROR',
    message: getDefaultMessage(HttpStatus.INTERNAL_SERVER_ERROR),
  };
}

export function getBootstrapErrorMessage(error: unknown): string {
  if (isRecord(error) && Array.isArray(error.message)) {
    return `Configuración inválida: ${error.message.join(', ')}`;
  }

  if (error instanceof Error) {
    if (error.message.includes('Config validation error')) {
      return 'Configuración inválida: revisa las variables de entorno en tu archivo .env';
    }

    return error.message;
  }

  return 'No se pudo iniciar la aplicación.';
}

export function getUnknownErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Ocurrió un error no controlado.';
}
