import { Logger } from 'winston';
import {
  getBootstrapErrorMessage,
  getUnknownErrorMessage,
} from './error-message.helper';

export function registerProcessErrorHandlers(logger?: Logger): void {
  process.on('unhandledRejection', (reason: unknown) => {
    const message = getUnknownErrorMessage(reason);

    if (logger) {
      logger.error(`Promesa rechazada no controlada: ${message}`);
      return;
    }

    console.error(`Promesa rechazada no controlada: ${message}`);
  });

  process.on('uncaughtException', (error: Error) => {
    const message = getUnknownErrorMessage(error);

    if (logger) {
      logger.error(`Excepción no controlada: ${message}`);
    } else {
      console.error(`Excepción no controlada: ${message}`);
    }

    process.exit(1);
  });
}

export function logBootstrapFailure(error: unknown, logger?: Logger): void {
  const message = getBootstrapErrorMessage(error);

  if (logger) {
    logger.error(message);
    return;
  }

  console.error(message);
}
