import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required for seed');
}

export const seedPrisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

export async function disconnectSeedClient(): Promise<void> {
  await seedPrisma.$disconnect();
}
