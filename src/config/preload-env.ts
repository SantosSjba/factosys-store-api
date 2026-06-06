import { config as loadEnv } from 'dotenv';

const nodeEnv = process.env.NODE_ENV ?? 'development';

loadEnv({ path: `.env.${nodeEnv}` });
loadEnv({ path: '.env' });

export function isGoogleAuthEnabled(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}
