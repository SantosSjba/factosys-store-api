import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.constants';

const PRESENCE_KEY = 'store:customers:online';
const WINDOW_MS = 5 * 60 * 1000;

export type OnlineCustomersSnapshot = {
  count: number;
  available: boolean;
  windowMinutes: number;
};

@Injectable()
export class CustomerPresenceService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis | null) {}

  async heartbeat(userId: string) {
    if (!this.redis) {
      return { ok: false, reason: 'REDIS_UNAVAILABLE' as const };
    }

    const now = Date.now();

    try {
      await this.redis.zadd(PRESENCE_KEY, now, userId);
      await this.redis.zremrangebyscore(PRESENCE_KEY, 0, now - WINDOW_MS);
      await this.redis.pexpire(PRESENCE_KEY, WINDOW_MS * 2);
      return { ok: true as const };
    } catch {
      return { ok: false, reason: 'REDIS_UNAVAILABLE' as const };
    }
  }

  async getOnlineCustomers(): Promise<OnlineCustomersSnapshot> {
    const windowMinutes = Math.round(WINDOW_MS / 60_000);

    if (!this.redis) {
      return { count: 0, available: false, windowMinutes };
    }

    try {
      const now = Date.now();
      await this.redis.zremrangebyscore(PRESENCE_KEY, 0, now - WINDOW_MS);
      const count = await this.redis.zcount(
        PRESENCE_KEY,
        now - WINDOW_MS,
        '+inf',
      );

      return { count, available: true, windowMinutes };
    } catch {
      return { count: 0, available: false, windowMinutes };
    }
  }
}
