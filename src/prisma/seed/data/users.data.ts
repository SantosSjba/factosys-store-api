import { ROLE_SLUGS } from '../../../shared/constants/roles.constants';

export interface SeedStaffUserDefinition {
  key: 'super' | 'admin';
  emailEnv: string;
  passwordEnv: string;
  defaultEmail: string;
  defaultPassword: string;
  firstName: string;
  lastName: string;
  assignAllRoles: boolean;
  roleSlug?: string;
}

export interface SeedStoreCustomerDefinition {
  key: 'customer';
  emailEnv: string;
  passwordEnv: string;
  defaultEmail: string;
  defaultPassword: string;
  firstName: string;
  lastName: string;
}

export const SEED_STAFF_USER_DEFINITIONS: SeedStaffUserDefinition[] = [
  {
    key: 'super',
    emailEnv: 'SEED_SUPER_EMAIL',
    passwordEnv: 'SEED_SUPER_PASSWORD',
    defaultEmail: 'super@factosys.store',
    defaultPassword: 'Super123!',
    firstName: 'Super',
    lastName: 'Factosys',
    assignAllRoles: true,
  },
  {
    key: 'admin',
    emailEnv: 'SEED_ADMIN_EMAIL',
    passwordEnv: 'SEED_ADMIN_PASSWORD',
    defaultEmail: 'admin@factosys.store',
    defaultPassword: 'Admin123!',
    firstName: 'Admin',
    lastName: 'Factosys',
    assignAllRoles: false,
    roleSlug: ROLE_SLUGS.ADMIN,
  },
];

/** Cliente de tienda para probar POST /api/store/auth/login */
export const SEED_STORE_CUSTOMER_DEFINITION: SeedStoreCustomerDefinition = {
  key: 'customer',
  emailEnv: 'SEED_CUSTOMER_EMAIL',
  passwordEnv: 'SEED_CUSTOMER_PASSWORD',
  defaultEmail: 'cliente@factosys.store',
  defaultPassword: 'Cliente123!',
  firstName: 'Cliente',
  lastName: 'Demo',
};

export function resolveSeedCredential(
  envKey: string,
  fallback: string,
): string {
  return process.env[envKey]?.trim() || fallback;
}
