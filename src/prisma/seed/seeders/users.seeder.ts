import * as bcrypt from 'bcrypt';
import { UserStatus, UserType } from '../../../generated/prisma/client';
import { ROLE_SLUGS } from '../../../shared/constants/roles.constants';
import { seedPrisma } from '../client';
import {
  resolveSeedCredential,
  SEED_STAFF_USER_DEFINITIONS,
  SEED_STORE_CUSTOMER_DEFINITION,
} from '../data/users.data';

async function assignRolesToUser(
  userId: string,
  roleSlugs: string[],
): Promise<void> {
  for (const slug of roleSlugs) {
    const role = await seedPrisma.role.findUnique({ where: { slug } });
    if (!role) {
      continue;
    }

    await seedPrisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId,
        roleId: role.id,
      },
    });
  }
}

export async function seedUsers(): Promise<string[]> {
  const allRoles = await seedPrisma.role.findMany({ select: { slug: true } });
  const allRoleSlugs = allRoles.map((role) => role.slug);
  const seededEmails: string[] = [];

  for (const userDef of SEED_STAFF_USER_DEFINITIONS) {
    const email = resolveSeedCredential(
      userDef.emailEnv,
      userDef.defaultEmail,
    );
    const password = resolveSeedCredential(
      userDef.passwordEnv,
      userDef.defaultPassword,
    );
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await seedPrisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        userType: UserType.STAFF,
        firstName: userDef.firstName,
        lastName: userDef.lastName,
      },
      create: {
        email,
        userType: UserType.STAFF,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        passwordHash,
        firstName: userDef.firstName,
        lastName: userDef.lastName,
      },
    });

    const roleSlugs = userDef.assignAllRoles
      ? allRoleSlugs
      : userDef.roleSlug
        ? [userDef.roleSlug]
        : [];

    await assignRolesToUser(user.id, roleSlugs);
    seededEmails.push(`staff/${userDef.key}: ${email}`);
  }

  const storeCustomer = await seedStoreCustomer();
  seededEmails.push(`store/${storeCustomer.key}: ${storeCustomer.email}`);

  return seededEmails;
}

async function seedStoreCustomer(): Promise<{
  key: string;
  email: string;
}> {
  const def = SEED_STORE_CUSTOMER_DEFINITION;
  const email = resolveSeedCredential(def.emailEnv, def.defaultEmail);
  const password = resolveSeedCredential(def.passwordEnv, def.defaultPassword);
  const passwordHash = await bcrypt.hash(password, 12);

  const customerRole = await seedPrisma.role.findUnique({
    where: { slug: ROLE_SLUGS.CUSTOMER },
  });

  if (!customerRole) {
    throw new Error('Rol customer no encontrado tras el seed de roles');
  }

  const user = await seedPrisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      userType: UserType.CUSTOMER,
      firstName: def.firstName,
      lastName: def.lastName,
    },
    create: {
      email,
      userType: UserType.CUSTOMER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      passwordHash,
      firstName: def.firstName,
      lastName: def.lastName,
    },
  });

  await assignRolesToUser(user.id, [ROLE_SLUGS.CUSTOMER]);

  return { key: def.key, email };
}

/** Garantiza que el rol admin conserve todos los permisos del catálogo. */
export async function syncAdminRolePermissions(): Promise<void> {
  const adminRole = await seedPrisma.role.findUnique({
    where: { slug: ROLE_SLUGS.ADMIN },
  });

  if (!adminRole) {
    return;
  }

  const permissions = await seedPrisma.permission.findMany();

  for (const permission of permissions) {
    await seedPrisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }
}
