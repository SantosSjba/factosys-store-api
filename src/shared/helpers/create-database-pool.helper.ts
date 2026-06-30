import { Pool } from 'pg';

type DatabasePoolConfig = {
  connectionString: string;
  max: number;
  connectionTimeoutMillis: number;
  idleTimeoutMillis: number;
  statementTimeoutMs: number;
};

export function createDatabasePool(config: DatabasePoolConfig): Pool {
  const pool = new Pool({
    connectionString: config.connectionString,
    max: config.max,
    connectionTimeoutMillis: config.connectionTimeoutMillis,
    idleTimeoutMillis: config.idleTimeoutMillis,
  });

  pool.on('connect', (client) => {
    void client.query(`SET statement_timeout TO ${config.statementTimeoutMs}`);
  });

  pool.on('error', (error) => {
    console.error('Error inesperado en el pool de PostgreSQL', error);
  });

  return pool;
}
