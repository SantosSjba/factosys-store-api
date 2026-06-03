import { Request } from 'express';

export function getRequestContext(request: Request): {
  ipAddress?: string;
  userAgent?: string;
} {
  const forwarded = request.headers['x-forwarded-for'];

  const ipAddress =
    (typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : undefined) ??
    request.ip ??
    request.socket.remoteAddress;

  const userAgent = request.headers['user-agent'];

  return {
    ipAddress,
    userAgent: typeof userAgent === 'string' ? userAgent : undefined,
  };
}
