import { Injectable, Logger } from '@nestjs/common';
import type {
  AdminAuditAction,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { buildPaginationMeta } from '../../../shared/helpers/pagination.helper';

export type RecordAuditParams = {
  userId?: string;
  action: AdminAuditAction;
  module: string;
  entityType?: string;
  entityId?: string;
  description: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
};

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  record(params: RecordAuditParams): void {
    this.prisma.adminAuditLog
      .create({
        data: {
          userId: params.userId,
          action: params.action,
          module: params.module,
          entityType: params.entityType,
          entityId: params.entityId,
          description: params.description,
          metadata: params.metadata,
          ipAddress: params.ipAddress,
        },
      })
      .catch((error: unknown) => {
        this.logger.warn(
          `No se pudo registrar auditoría: ${params.description}`,
          error instanceof Error ? error.stack : undefined,
        );
      });
  }

  async list(params: {
    page?: number;
    limit?: number;
    module?: string;
    search?: string;
  }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AdminAuditLogWhereInput = {};

    if (params.module) {
      where.module = params.module;
    }

    if (params.search?.trim()) {
      const term = params.search.trim();
      where.OR = [
        { description: { contains: term, mode: 'insensitive' } },
        { entityType: { contains: term, mode: 'insensitive' } },
        { entityId: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return buildPaginationMeta(
      { page, limit },
      items.map((item) => ({
        id: item.id,
        action: item.action,
        module: item.module,
        entityType: item.entityType,
        entityId: item.entityId,
        description: item.description,
        metadata: item.metadata,
        ipAddress: item.ipAddress,
        createdAt: item.createdAt,
        user: item.user
          ? {
              id: item.user.id,
              email: item.user.email,
              name:
                [item.user.firstName, item.user.lastName]
                  .filter(Boolean)
                  .join(' ') || null,
            }
          : null,
      })),
      total,
    );
  }
}
