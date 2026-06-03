export const PERMISSIONS = {
  USERS_READ: 'users.read',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  ROLES_READ: 'roles.read',
  ROLES_ASSIGN: 'roles.assign',
  PRODUCTS_READ: 'products.read',
  PRODUCTS_WRITE: 'products.write',
  ORDERS_READ: 'orders.read',
  ORDERS_WRITE: 'orders.write',
  INVENTORY_READ: 'inventory.read',
  INVENTORY_WRITE: 'inventory.write',
  SETTINGS_READ: 'settings.read',
  SETTINGS_WRITE: 'settings.write',
  REPORTS_READ: 'reports.read',
} as const;

export type PermissionSlug =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);
