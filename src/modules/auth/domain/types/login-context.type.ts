export interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface GoogleProfilePayload {
  googleId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}
