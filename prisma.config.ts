import { config } from 'dotenv';
import { resolve } from 'path';
import { defineConfig, env } from 'prisma/config';

config({ path: resolve(process.cwd(), `.env.${process.env.NODE_ENV ?? 'development'}`) });
config({ path: resolve(process.cwd(), '.env') });

export default defineConfig({
  schema: 'src/prisma/schema.prisma',
  migrations: {
    path: 'src/prisma/migrations',
    seed: 'ts-node -r tsconfig-paths/register src/prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
