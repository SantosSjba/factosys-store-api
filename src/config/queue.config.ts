import { registerAs } from '@nestjs/config';

export const queueConfig = registerAs('queue', () => ({
  prefix: process.env.QUEUE_PREFIX ?? 'factosys',
  defaultJobAttempts: Number(process.env.QUEUE_DEFAULT_ATTEMPTS ?? 3),
  removeOnComplete: Number(process.env.QUEUE_REMOVE_ON_COMPLETE ?? 500),
  removeOnFail: Number(process.env.QUEUE_REMOVE_ON_FAIL ?? 500),
}));
