import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../constants/auth.constants';
import { PermissionSlug } from '../constants/permissions.constants';

export const RequirePermissions = (...permissions: PermissionSlug[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
