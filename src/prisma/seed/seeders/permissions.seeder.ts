import { seedPrisma } from '../client';
import { PERMISSION_SEED_DEFINITIONS } from '../data/permissions.data';

export async function seedPermissions(): Promise<void> {
  for (const permission of PERMISSION_SEED_DEFINITIONS) {
    await seedPrisma.permission.upsert({
      where: { slug: permission.slug },
      update: {
        name: permission.name,
        module: permission.module,
      },
      create: permission,
    });
  }
}
