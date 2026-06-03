import { config } from 'dotenv';
import { resolve } from 'path';
import { defineConfig, env } from 'prisma/config';

config({ path: resolve(process.cwd(), `.env.${process.env.NODE_ENV ?? 'development'}`) });
config({ path: resolve(process.cwd(), '.env') });

export default defineConfig({
  schema: 'src/prisma/schema',
  migrations: {
    path: 'src/prisma/migrations',
    seed: 'tsx src/prisma/seed/index.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
