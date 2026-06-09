import { PERMISSIONS } from '../../../shared/constants/permissions.constants';

export interface PermissionSeedDefinition {
  slug: string;
  name: string;
  module: string;
}

export const PERMISSION_SEED_DEFINITIONS: PermissionSeedDefinition[] = [
  { slug: PERMISSIONS.USERS_READ, name: 'Ver usuarios', module: 'users' },
  { slug: PERMISSIONS.USERS_CREATE, name: 'Crear usuarios', module: 'users' },
  { slug: PERMISSIONS.USERS_UPDATE, name: 'Editar usuarios', module: 'users' },
  {
    slug: PERMISSIONS.USERS_DELETE,
    name: 'Eliminar usuarios',
    module: 'users',
  },
  { slug: PERMISSIONS.ROLES_READ, name: 'Ver roles', module: 'roles' },
  { slug: PERMISSIONS.ROLES_ASSIGN, name: 'Asignar roles', module: 'roles' },
  {
    slug: PERMISSIONS.PRODUCTS_READ,
    name: 'Ver productos',
    module: 'products',
  },
  {
    slug: PERMISSIONS.PRODUCTS_WRITE,
    name: 'Gestionar productos',
    module: 'products',
  },
  { slug: PERMISSIONS.ORDERS_READ, name: 'Ver pedidos', module: 'orders' },
  {
    slug: PERMISSIONS.ORDERS_WRITE,
    name: 'Gestionar pedidos',
    module: 'orders',
  },
  {
    slug: PERMISSIONS.INVENTORY_READ,
    name: 'Ver inventario',
    module: 'inventory',
  },
  {
    slug: PERMISSIONS.INVENTORY_WRITE,
    name: 'Gestionar inventario',
    module: 'inventory',
  },
  {
    slug: PERMISSIONS.SETTINGS_READ,
    name: 'Ver configuración',
    module: 'settings',
  },
  {
    slug: PERMISSIONS.SETTINGS_WRITE,
    name: 'Editar configuración',
    module: 'settings',
  },
  { slug: PERMISSIONS.REPORTS_READ, name: 'Ver reportes', module: 'reports' },
  { slug: PERMISSIONS.COUPONS_READ, name: 'Ver cupones', module: 'coupons' },
  {
    slug: PERMISSIONS.COUPONS_WRITE,
    name: 'Gestionar cupones',
    module: 'coupons',
  },
  {
    slug: PERMISSIONS.MARKETING_READ,
    name: 'Ver marketing',
    module: 'marketing',
  },
  {
    slug: PERMISSIONS.MARKETING_WRITE,
    name: 'Gestionar marketing',
    module: 'marketing',
  },
];
