import { registerAs } from '@nestjs/config';

export const corsConfig = registerAs('cors', () => {
  const origins = [
    process.env.FRONTEND_URL,
    process.env.ADMIN_FRONTEND_URL,
    process.env.APP_URL,
  ].filter((value): value is string => Boolean(value));

  return {
    origins: [...new Set(origins)],
    credentials: true,
  };
});
