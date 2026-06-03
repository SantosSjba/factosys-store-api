import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient, UserStatus, UserType } from '../generated/prisma/client';
import { PERMISSIONS } from '../shared/constants/permissions.constants';
import { ROLE_SLUGS } from '../shared/constants/roles.constants';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required for seed');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const PERMISSION_DEFINITIONS = [
  { slug: PERMISSIONS.USERS_READ, name: 'Ver usuarios', module: 'users' },
  { slug: PERMISSIONS.USERS_CREATE, name: 'Crear usuarios', module: 'users' },
  { slug: PERMISSIONS.USERS_UPDATE, name: 'Editar usuarios', module: 'users' },
  { slug: PERMISSIONS.USERS_DELETE, name: 'Eliminar usuarios', module: 'users' },
  { slug: PERMISSIONS.ROLES_READ, name: 'Ver roles', module: 'roles' },
  { slug: PERMISSIONS.ROLES_ASSIGN, name: 'Asignar roles', module: 'roles' },
  { slug: PERMISSIONS.PRODUCTS_READ, name: 'Ver productos', module: 'products' },
  { slug: PERMISSIONS.PRODUCTS_WRITE, name: 'Gestionar productos', module: 'products' },
  { slug: PERMISSIONS.ORDERS_READ, name: 'Ver pedidos', module: 'orders' },
  { slug: PERMISSIONS.ORDERS_WRITE, name: 'Gestionar pedidos', module: 'orders' },
  { slug: PERMISSIONS.INVENTORY_READ, name: 'Ver inventario', module: 'inventory' },
  { slug: PERMISSIONS.INVENTORY_WRITE, name: 'Gestionar inventario', module: 'inventory' },
  { slug: PERMISSIONS.SETTINGS_READ, name: 'Ver configuración', module: 'settings' },
  { slug: PERMISSIONS.SETTINGS_WRITE, name: 'Editar configuración', module: 'settings' },
  { slug: PERMISSIONS.REPORTS_READ, name: 'Ver reportes', module: 'reports' },
];

const ROLE_DEFINITIONS = [
  {
    slug: ROLE_SLUGS.CUSTOMER,
    name: 'Cliente',
    userType: UserType.CUSTOMER,
    description: 'Usuario de la tienda online',
    permissions: [] as string[],
  },
  {
    slug: ROLE_SLUGS.ADMIN,
    name: 'Administrador',
    userType: UserType.STAFF,
    description: 'Acceso total al panel administrativo',
    permissions: Object.values(PERMISSIONS),
  },
  {
    slug: ROLE_SLUGS.MANAGER,
    name: 'Gestor',
    userType: UserType.STAFF,
    description: 'Gestión de catálogo y pedidos',
    permissions: [
      PERMISSIONS.PRODUCTS_READ,
      PERMISSIONS.PRODUCTS_WRITE,
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.ORDERS_WRITE,
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.REPORTS_READ,
    ],
  },
  {
    slug: ROLE_SLUGS.SUPPORT,
    name: 'Soporte',
    userType: UserType.STAFF,
    description: 'Atención al cliente y consulta de pedidos',
    permissions: [PERMISSIONS.ORDERS_READ, PERMISSIONS.USERS_READ],
  },
  {
    slug: ROLE_SLUGS.WAREHOUSE,
    name: 'Almacén',
    userType: UserType.STAFF,
    description: 'Gestión de inventario y almacenes',
    permissions: [
      PERMISSIONS.INVENTORY_READ,
      PERMISSIONS.INVENTORY_WRITE,
      PERMISSIONS.ORDERS_READ,
    ],
  },
];

async function main(): Promise<void> {
  for (const permission of PERMISSION_DEFINITIONS) {
    await prisma.permission.upsert({
      where: { slug: permission.slug },
      update: {
        name: permission.name,
        module: permission.module,
      },
      create: permission,
    });
  }

  for (const roleDef of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
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
      const permission = await prisma.permission.findUnique({
        where: { slug: permissionSlug },
      });

      if (!permission) {
        continue;
      }

      await prisma.rolePermission.upsert({
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

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@factosys.store';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';

  const adminRole = await prisma.role.findUnique({
    where: { slug: ROLE_SLUGS.ADMIN },
  });

  if (!adminRole) {
    throw new Error('Admin role not found after seed');
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      userType: UserType.STAFF,
    },
    create: {
      email: adminEmail,
      userType: UserType.STAFF,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      passwordHash,
      firstName: 'Admin',
      lastName: 'Factosys',
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  console.log(`Seed completado. Admin: ${adminEmail}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
