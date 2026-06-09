import {
  AuthProvider,
  UserStatus,
  UserType,
} from '../../../../generated/prisma/client';

export interface UserWithAccess {
  id: string;
  email: string;
  userType: UserType;
  authProvider: AuthProvider;
  status: UserStatus;
  passwordHash: string | null;
  googleId: string | null;
  emailVerifiedAt: Date | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
  roles: { slug: string; name: string }[];
  permissions: string[];
}
