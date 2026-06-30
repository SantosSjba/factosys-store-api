import { registerAs } from '@nestjs/config';

function readMs(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw.trim() === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const timeoutsConfig = registerAs('timeouts', () => ({
  /** Tiempo máximo de procesamiento por request HTTP (ms). */
  httpRequestMs: readMs('HTTP_REQUEST_TIMEOUT_MS', 120_000),
  /** Umbral para log de request lento (ms). */
  httpSlowRequestMs: readMs('HTTP_SLOW_REQUEST_MS', 3_000),
  /** Timeout de socket inactivo del servidor Node (ms). */
  httpServerSocketMs: readMs('HTTP_SERVER_SOCKET_TIMEOUT_MS', 130_000),

  dbConnectionMs: readMs('DB_CONNECTION_TIMEOUT_MS', 10_000),
  dbStatementMs: readMs('DB_STATEMENT_TIMEOUT_MS', 60_000),
  dbPoolMax: readMs('DB_POOL_MAX', 10),
  dbPoolIdleMs: readMs('DB_POOL_IDLE_TIMEOUT_MS', 30_000),
  dbTransactionMaxWaitMs: readMs('DB_TRANSACTION_MAX_WAIT_MS', 15_000),
  dbTransactionTimeoutMs: readMs('DB_TRANSACTION_TIMEOUT_MS', 60_000),

  redisConnectMs: readMs('REDIS_CONNECT_TIMEOUT_MS', 5_000),
  redisCommandMs: readMs('REDIS_COMMAND_TIMEOUT_MS', 10_000),

  mailConnectionMs: readMs('MAIL_CONNECTION_TIMEOUT_MS', 10_000),
  mailGreetingMs: readMs('MAIL_GREETING_TIMEOUT_MS', 10_000),
  mailSocketMs: readMs('MAIL_SOCKET_TIMEOUT_MS', 30_000),

  s3RequestMs: readMs('S3_REQUEST_TIMEOUT_MS', 30_000),
}));
