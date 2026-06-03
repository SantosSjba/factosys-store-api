import { registerAs } from '@nestjs/config';

export const mailConfig = registerAs('mail', () => ({
  host: process.env.MAIL_HOST ?? 'localhost',
  port: Number(process.env.MAIL_PORT ?? 1025),
  user: process.env.MAIL_USER ?? '',
  password: process.env.MAIL_PASSWORD ?? '',
  from: process.env.MAIL_FROM ?? 'no-reply@factosys.store',
  secure: process.env.MAIL_SECURE === 'true',
}));
