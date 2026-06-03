import { AuthAudience } from '../constants/auth.constants';

export interface JwtPayload {
  sub: string;
  email: string;
  userType: 'CUSTOMER' | 'STAFF';
  roles: string[];
  aud: AuthAudience;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  userType: 'CUSTOMER' | 'STAFF';
  roles: string[];
  permissions: string[];
  audience: AuthAudience;
}
