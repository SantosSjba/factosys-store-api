export const ROLE_SLUGS = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
  MANAGER: 'manager',
  SUPPORT: 'support',
  WAREHOUSE: 'warehouse',
} as const;

export type RoleSlug = (typeof ROLE_SLUGS)[keyof typeof ROLE_SLUGS];
