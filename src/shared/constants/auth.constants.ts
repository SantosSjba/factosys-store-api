export const AUTH_AUDIENCE = {
  STORE: 'factosys-store',
  ADMIN: 'factosys-admin',
} as const;

export type AuthAudience =
  (typeof AUTH_AUDIENCE)[keyof typeof AUTH_AUDIENCE];

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
export const PERMISSIONS_KEY = 'permissions';
export const USER_TYPES_KEY = 'userTypes';
