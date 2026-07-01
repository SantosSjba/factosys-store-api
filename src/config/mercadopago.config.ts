import { registerAs } from '@nestjs/config';

export const mercadoPagoConfig = registerAs('mercadopago', () => ({
  enabled: process.env.MERCADOPAGO_ENABLED === 'true',
  isTestMode: process.env.MERCADOPAGO_TEST_MODE !== 'false',
  publicKey: process.env.MERCADOPAGO_PUBLIC_KEY ?? '',
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? '',
  appId: process.env.MERCADOPAGO_APP_ID ?? '',
  userId: process.env.MERCADOPAGO_USER_ID ?? '',
  webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET ?? '',
}));
