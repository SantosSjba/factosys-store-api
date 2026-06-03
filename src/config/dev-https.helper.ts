import { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DEV_KEY = join(process.cwd(), 'certs', 'dev-key.pem');
const DEV_CERT = join(process.cwd(), 'certs', 'dev-cert.pem');

export function isDevHttpsEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return process.env.DEV_HTTPS === 'true';
}

export function resolveDevHttpsOptions(): HttpsOptions | undefined {
  if (!isDevHttpsEnabled()) {
    return undefined;
  }

  if (!existsSync(DEV_KEY) || !existsSync(DEV_CERT)) {
    console.warn(
      '[DEV_HTTPS] DEV_HTTPS=true pero faltan certs/dev-key.pem y certs/dev-cert.pem. Ejecuta: pnpm certs:dev',
    );
    return undefined;
  }

  return {
    key: readFileSync(DEV_KEY),
    cert: readFileSync(DEV_CERT),
  };
}

export function getDevSwaggerUrls(
  port: number,
  usingHttps: boolean,
): { httpUrl: string; httpsUrl?: string } {
  const host = '127.0.0.1';
  const httpUrl = `http://${host}:${port}/docs`;
  const httpsUrl = usingHttps ? `https://${host}:${port}/docs` : undefined;
  return { httpUrl, httpsUrl };
}
