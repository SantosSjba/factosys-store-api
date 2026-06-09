import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AdminAuditAction } from '../../generated/prisma/client';
import { AdminAuditService } from '../../modules/audit/application/admin-audit.service';
import type { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

const SKIP_PATH_PATTERNS = [
  /\/admin\/auth\/(login|refresh|logout)/,
  /\/webhooks\//,
];

@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AdminAuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      method: string;
      originalUrl: string;
      url?: string;
      ip?: string;
      user?: AuthenticatedUser;
      params?: Record<string, string>;
    }>();

    const method = request.method.toUpperCase();
    const path = request.originalUrl ?? request.url ?? '';

    if (!this.shouldAudit(method, path, request.user)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          this.auditService.record({
            userId: request.user?.id,
            action: this.resolveAction(method, path),
            module: this.resolveModule(path),
            entityType: this.resolveEntityType(path),
            entityId: request.params?.id,
            description: this.buildDescription(method, path),
            ipAddress: request.ip,
          });
        },
      }),
    );
  }

  private shouldAudit(
    method: string,
    path: string,
    user?: AuthenticatedUser,
  ): boolean {
    if (!MUTATING_METHODS.has(method)) return false;
    if (!path.includes('/admin/')) return false;
    if (user?.userType !== 'STAFF') return false;
    if (SKIP_PATH_PATTERNS.some((pattern) => pattern.test(path))) return false;
    return true;
  }

  private resolveModule(path: string): string {
    const segments = this.pathSegments(path);
    const adminIndex = segments.indexOf('admin');
    if (adminIndex === -1) return 'admin';

    const next = segments[adminIndex + 1];
    if (!next) return 'admin';

    if (next === 'catalog') {
      return segments[adminIndex + 2] ?? 'catalog';
    }

    return next;
  }

  private resolveEntityType(path: string): string | undefined {
    const segments = this.pathSegments(path);
    const adminIndex = segments.indexOf('admin');
    if (adminIndex === -1) return undefined;

    const resource = segments[adminIndex + 1];
    if (!resource) return undefined;

    const map: Record<string, string> = {
      orders: 'Order',
      returns: 'ReturnRequest',
      media: 'MediaAsset',
      banners: 'Banner',
      campaigns: 'Campaign',
      coupons: 'Coupon',
      users: 'User',
      roles: 'Role',
      'payment-gateways': 'PaymentGateway',
    };

    return map[resource];
  }

  private resolveAction(method: string, path: string): AdminAuditAction {
    if (path.includes('/import')) return AdminAuditAction.IMPORT;
    if (path.includes('/export')) return AdminAuditAction.EXPORT;
    if (path.includes('/upload') || path.includes('/payment-evidence')) {
      return AdminAuditAction.UPLOAD;
    }
    if (path.includes('/status')) return AdminAuditAction.STATUS_CHANGE;

    if (method === 'DELETE') return AdminAuditAction.DELETE;
    if (method === 'POST') return AdminAuditAction.CREATE;
    return AdminAuditAction.UPDATE;
  }

  private buildDescription(method: string, path: string): string {
    const segments = this.pathSegments(path);
    const resource = this.resolveModule(path);

    if (path.includes('/media/upload')) {
      return 'Archivo subido a biblioteca de medios';
    }
    if (path.includes('/payment-evidence')) {
      return 'Comprobante de pago registrado en pedido';
    }
    if (path.includes('/status') && resource === 'orders') {
      return 'Estado de pedido actualizado';
    }
    if (path.includes('/import')) {
      return `Importación en ${resource}`;
    }

    const tail = segments.slice(-2).join('/');
    return `${method} ${resource}${tail ? ` (${tail})` : ''}`;
  }

  private pathSegments(path: string): string[] {
    return path.split('?')[0].split('/').filter(Boolean);
  }
}
