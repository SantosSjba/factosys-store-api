import { ROLE_SLUGS } from '../../../shared/constants/roles.constants';

export interface SeedUserDefinition {
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

export const SEED_USER_DEFINITIONS: SeedUserDefinition[] = [
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

export function resolveSeedCredential(
  envKey: string,
  fallback: string,
): string {
  return process.env[envKey]?.trim() || fallback;
}
