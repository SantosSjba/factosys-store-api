import { UserType } from '../../../generated/prisma/client';
import { PERMISSIONS } from '../../../shared/constants/permissions.constants';
import { ROLE_SLUGS } from '../../../shared/constants/roles.constants';

export interface RoleSeedDefinition {
  slug: string;
  name: string;
  userType: UserType;
  description: string;
  permissions: string[];
}

export const ROLE_SEED_DEFINITIONS: RoleSeedDefinition[] = [
  {
    slug: ROLE_SLUGS.CUSTOMER,
    name: 'Cliente',
    userType: UserType.CUSTOMER,
    description: 'Usuario de la tienda online',
    permissions: [],
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
      PERMISSIONS.COUPONS_READ,
      PERMISSIONS.COUPONS_WRITE,
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
