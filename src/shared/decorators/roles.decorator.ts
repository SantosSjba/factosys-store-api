import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../constants/auth.constants';
import { RoleSlug } from '../constants/roles.constants';

export const Roles = (...roles: RoleSlug[]) => SetMetadata(ROLES_KEY, roles);
