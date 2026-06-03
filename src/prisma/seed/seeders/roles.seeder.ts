import { seedPrisma } from '../client';
import { ROLE_SEED_DEFINITIONS } from '../data/roles.data';

export async function seedRoles(): Promise<void> {
  for (const roleDef of ROLE_SEED_DEFINITIONS) {
    const role = await seedPrisma.role.upsert({
      where: { slug: roleDef.slug },
      update: {
        name: roleDef.name,
        description: roleDef.description,
        userType: roleDef.userType,
        isSystem: true,
      },
      create: {
        slug: roleDef.slug,
        name: roleDef.name,
        description: roleDef.description,
        userType: roleDef.userType,
        isSystem: true,
      },
    });

    for (const permissionSlug of roleDef.permissions) {
      const permission = await seedPrisma.permission.findUnique({
        where: { slug: permissionSlug },
      });

      if (!permission) {
        continue;
      }

      await seedPrisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }
}
