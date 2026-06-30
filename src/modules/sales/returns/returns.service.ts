import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import {
  OrderStatus,
  ReturnRequestStatus,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { buildPaginationMeta } from '../../../shared/helpers/pagination.helper';
import { PrismaOrderRepository } from '../infrastructure/repositories/prisma-order.repository';
import type {
  CreateReturnRequestDto,
  UpdateReturnStatusDto,
} from './return.dto';

const ALLOWED_TRANSITIONS: Record<ReturnRequestStatus, ReturnRequestStatus[]> =
  {
    [ReturnRequestStatus.REQUESTED]: [
      ReturnRequestStatus.APPROVED,
      ReturnRequestStatus.REJECTED,
      ReturnRequestStatus.CANCELLED,
    ],
    [ReturnRequestStatus.APPROVED]: [
      ReturnRequestStatus.RECEIVED,
      ReturnRequestStatus.CANCELLED,
    ],
    [ReturnRequestStatus.RECEIVED]: [ReturnRequestStatus.REFUNDED],
    [ReturnRequestStatus.REJECTED]: [],
    [ReturnRequestStatus.REFUNDED]: [],
    [ReturnRequestStatus.CANCELLED]: [],
  };

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderRepository: PrismaOrderRepository,
  ) {}

  async list(params: {
    page?: number;
    limit?: number;
    status?: ReturnRequestStatus;
    search?: string;
  }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ReturnRequestWhereInput = {};

    if (params.status) where.status = params.status;
    if (params.search?.trim()) {
      const term = params.search.trim();
      where.OR = [
        { returnNumber: { contains: term, mode: 'insensitive' } },
        { order: { orderNumber: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.returnRequest.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              currencyCode: true,
            },
          },
          items: { include: { orderItem: true } },
          createdBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          handledBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { requestedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.returnRequest.count({ where }),
    ]);

    return buildPaginationMeta(
      { page, limit },
      items.map((item) => this.mapReturn(item)),
      total,
    );
  }

  async getById(id: string) {
    const item = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            currencyCode: true,
            status: true,
          },
        },
        items: { include: { orderItem: true } },
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        handledBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    if (!item) {
      throw new NotFoundException({
        code: 'RETURN_NOT_FOUND',
        message: 'Devolución no encontrada.',
      });
    }
    return this.mapReturn(item);
  }

  async create(dto: CreateReturnRequestDto, staffUserId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Pedido no encontrado.',
      });
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException({
        code: 'ORDER_NOT_DELIVERED',
        message: 'Solo pedidos entregados pueden tener devoluciones.',
      });
    }

    for (const item of dto.items) {
      const orderItem = order.items.find((oi) => oi.id === item.orderItemId);
      if (!orderItem) {
        throw new BadRequestException({
          code: 'INVALID_ORDER_ITEM',
          message: 'Ítem de pedido inválido.',
        });
      }
      if (item.quantity > orderItem.quantity) {
        throw new BadRequestException({
          code: 'INVALID_QUANTITY',
          message: 'Cantidad de devolución excede la del pedido.',
        });
      }
    }

    const returnNumber = await this.nextReturnNumber();

    const created = await this.prisma.returnRequest.create({
      data: {
        returnNumber,
        orderId: dto.orderId,
        reason: dto.reason,
        reasonNote: dto.reasonNote?.trim() || null,
        restockItems: dto.restockItems ?? true,
        internalNotes: dto.internalNotes?.trim() || null,
        createdById: staffUserId,
        items: {
          create: dto.items.map((item) => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            currencyCode: true,
          },
        },
        items: { include: { orderItem: true } },
        createdBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        handledBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    return this.mapReturn(created);
  }

  async updateStatus(
    id: string,
    dto: UpdateReturnStatusDto,
    staffUserId?: string,
  ) {
    const existing = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: { order: true, items: { include: { orderItem: true } } },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'RETURN_NOT_FOUND',
        message: 'Devolución no encontrada.',
      });
    }

    const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException({
        code: 'INVALID_RETURN_TRANSITION',
        message: `No se puede cambiar de ${existing.status} a ${dto.status}.`,
      });
    }

    const now = new Date();
    const timestamps: Record<string, Date | null> = {};

    if (dto.status === ReturnRequestStatus.APPROVED)
      timestamps.approvedAt = now;
    if (dto.status === ReturnRequestStatus.REJECTED)
      timestamps.rejectedAt = now;
    if (dto.status === ReturnRequestStatus.RECEIVED)
      timestamps.receivedAt = now;
    if (dto.status === ReturnRequestStatus.REFUNDED)
      timestamps.refundedAt = now;

    const updated = await this.prisma.runTransaction(async (tx) => {
      const result = await tx.returnRequest.update({
        where: { id },
        data: {
          status: dto.status,
          refundAmount:
            dto.refundAmount != null ? dto.refundAmount : existing.refundAmount,
          internalNotes: dto.internalNotes?.trim() ?? existing.internalNotes,
          handledById: staffUserId,
          ...timestamps,
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              currencyCode: true,
            },
          },
          items: { include: { orderItem: true } },
          createdBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          handledBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });

      if (
        dto.status === ReturnRequestStatus.RECEIVED &&
        existing.restockItems &&
        existing.order.warehouseId
      ) {
        for (const item of existing.items) {
          if (!item.orderItem.variantId) continue;
          const level = await this.orderRepository.getStockLevelInTransaction(
            tx,
            existing.order.warehouseId,
            item.orderItem.variantId,
          );
          const quantityBefore = level?.quantityOnHand ?? 0;
          const quantityAfter = quantityBefore + item.quantity;
          await this.orderRepository.upsertStockLevelInTransaction(
            tx,
            existing.order.warehouseId,
            item.orderItem.variantId,
            quantityAfter,
          );
          await this.orderRepository.createMovementInTransaction(tx, {
            warehouseId: existing.order.warehouseId,
            variantId: item.orderItem.variantId,
            quantityChange: item.quantity,
            quantityBefore,
            quantityAfter,
            note: `Reingreso RMA ${existing.returnNumber}`,
            performedById: staffUserId ?? null,
          });
        }
      }

      return result;
    });

    return this.mapReturn(updated);
  }

  private async nextReturnNumber() {
    const count = await this.prisma.returnRequest.count();
    return `RMA-${String(count + 1).padStart(5, '0')}`;
  }

  private mapReturn(item: {
    id: string;
    returnNumber: string;
    orderId: string;
    status: ReturnRequestStatus;
    reason: string;
    reasonNote: string | null;
    restockItems: boolean;
    refundAmount: { toString(): string } | null;
    internalNotes: string | null;
    requestedAt: Date;
    approvedAt: Date | null;
    receivedAt: Date | null;
    refundedAt: Date | null;
    rejectedAt: Date | null;
    order: {
      id: string;
      orderNumber: string;
      total: { toString(): string };
      currencyCode: string;
    };
    items: Array<{
      id: string;
      quantity: number;
      orderItem: {
        id: string;
        sku: string;
        productName: string;
        variantName: string | null;
      };
    }>;
    createdBy?: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    } | null;
    handledBy?: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    } | null;
  }) {
    const mapUser = (
      u?: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
      } | null,
    ) =>
      u
        ? {
            id: u.id,
            email: u.email,
            name: [u.firstName, u.lastName].filter(Boolean).join(' ') || null,
          }
        : null;

    return {
      id: item.id,
      returnNumber: item.returnNumber,
      orderId: item.orderId,
      order: {
        id: item.order.id,
        orderNumber: item.order.orderNumber,
        total: item.order.total.toString(),
        currencyCode: item.order.currencyCode,
      },
      status: item.status,
      reason: item.reason,
      reasonNote: item.reasonNote,
      restockItems: item.restockItems,
      refundAmount: item.refundAmount?.toString() ?? null,
      internalNotes: item.internalNotes,
      requestedAt: item.requestedAt,
      approvedAt: item.approvedAt,
      receivedAt: item.receivedAt,
      refundedAt: item.refundedAt,
      rejectedAt: item.rejectedAt,
      items: item.items.map((ri) => ({
        id: ri.id,
        quantity: ri.quantity,
        orderItem: {
          id: ri.orderItem.id,
          sku: ri.orderItem.sku,
          productName: ri.orderItem.productName,
          variantName: ri.orderItem.variantName,
        },
      })),
      createdBy: mapUser(item.createdBy),
      handledBy: mapUser(item.handledBy),
    };
  }
}
