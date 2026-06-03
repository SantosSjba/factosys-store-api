import { SetMetadata } from '@nestjs/common';
import { USER_TYPES_KEY } from '../constants/auth.constants';

export type AllowedUserType = 'CUSTOMER' | 'STAFF';

export const UserTypes = (...userTypes: AllowedUserType[]) =>
  SetMetadata(USER_TYPES_KEY, userTypes);
