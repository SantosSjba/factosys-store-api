import { Injectable } from '@nestjs/common';
import type {
  OrderAddressType,
  OrderPaymentStatus,
  OrderSource,
  OrderStatus,
  Prisma,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';

const orderSummaryInclude = {
  customer: true,
  warehouse: true,
  _count: { select: { items: true } },
} satisfies Prisma.OrderInclude;

const orderDetailInclude = {
  customer: true,
  warehouse: true,
  createdBy: true,
  items: { orderBy: { sortOrder: 'asc' as const } },
  addresses: true,
  statusHistory: {
    orderBy: { createdAt: 'desc' as const },
    include: { performedBy: true },
  },
} satisfies Prisma.OrderInclude;

@Injectable()
export class PrismaOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  runTransaction<T>(handler: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(handler);
  }

  findById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: orderDetailInclude,
    });
  }

  async listPaginated(params: {
    page: number;
    limit: number;
    search?: string;
    status?: OrderStatus;
    paymentStatus?: OrderPaymentStatus;
    customerId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const where: Prisma.OrderWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.paymentStatus ? { paymentStatus: params.paymentStatus } : {}),
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(params.dateFrom || params.dateTo
        ? {
            createdAt: {
              ...(params.dateFrom ? { gte: params.dateFrom } : {}),
              ...(params.dateTo ? { lte: params.dateTo } : {}),
            },
          }
        : {}),
      ...(params.search
        ? {
            OR: [
              { orderNumber: { contains: params.search, mode: 'insensitive' } },
              { guestEmail: { contains: params.search, mode: 'insensitive' } },
              { guestFirstName: { contains: params.search, mode: 'insensitive' } },
              { guestLastName: { contains: params.search, mode: 'insensitive' } },
              {
                customer: {
                  email: { contains: params.search, mode: 'insensitive' },
                },
              },
              {
                customer: {
                  firstName: { contains: params.search, mode: 'insensitive' },
                },
              },
              {
                customer: {
                  lastName: { contains: params.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: orderSummaryInclude,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total };
  }

  incrementOrderNumber(tx: Prisma.TransactionClient) {
    return tx.storeSettings.update({
      where: { id: 'default' },
      data: { lastOrderNumber: { increment: 1 } },
      select: { orderNumberPrefix: true, lastOrderNumber: true },
    });
  }

  createInTransaction(
    tx: Prisma.TransactionClient,
    data: Prisma.OrderCreateInput,
  ) {
    return tx.order.create({
      data,
      include: orderDetailInclude,
    });
  }

  updateInTransaction(
    tx: Prisma.TransactionClient,
    id: string,
    data: Prisma.OrderUpdateInput,
  ) {
    return tx.order.update({
      where: { id },
      data,
      include: orderDetailInclude,
    });
  }

  createStatusHistoryInTransaction(
    tx: Prisma.TransactionClient,
    data: {
      orderId: string;
      fromStatus?: OrderStatus | null;
      toStatus: OrderStatus;
      fromPaymentStatus?: OrderPaymentStatus | null;
      toPaymentStatus?: OrderPaymentStatus | null;
      note?: string | null;
      performedById?: string | null;
    },
  ) {
    return tx.orderStatusHistory.create({ data });
  }

  findActiveReservationsByOrder(tx: Prisma.TransactionClient, orderId: string) {
    return tx.stockReservation.findMany({
      where: { orderId, status: 'ACTIVE' },
    });
  }

  getStockLevelInTransaction(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    variantId: string,
  ) {
    return tx.stockLevel.findUnique({
      where: { warehouseId_variantId: { warehouseId, variantId } },
    });
  }

  updateReservedInTransaction(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    variantId: string,
    quantityReserved: number,
  ) {
    return tx.stockLevel.update({
      where: { warehouseId_variantId: { warehouseId, variantId } },
      data: { quantityReserved },
    });
  }

  upsertStockLevelInTransaction(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    variantId: string,
    quantityOnHand: number,
  ) {
    return tx.stockLevel.upsert({
      where: { warehouseId_variantId: { warehouseId, variantId } },
      update: { quantityOnHand },
      create: { warehouseId, variantId, quantityOnHand },
    });
  }

  createReservationInTransaction(
    tx: Prisma.TransactionClient,
    data: {
      warehouseId: string;
      variantId: string;
      orderId: string;
      quantity: number;
      reference?: string | null;
      note?: string | null;
      performedById?: string | null;
    },
  ) {
    return tx.stockReservation.create({
      data: { ...data, status: 'ACTIVE' },
    });
  }

  releaseReservationInTransaction(tx: Prisma.TransactionClient, id: string) {
    return tx.stockReservation.update({
      where: { id },
      data: { status: 'RELEASED', releasedAt: new Date() },
    });
  }

  createMovementInTransaction(
    tx: Prisma.TransactionClient,
    data: {
      warehouseId: string;
      variantId: string;
      quantityChange: number;
      quantityBefore: number;
      quantityAfter: number;
      note?: string | null;
      performedById?: string | null;
    },
  ) {
    return tx.stockMovement.create({
      data: {
        warehouseId: data.warehouseId,
        variantId: data.variantId,
        type: 'SHIPMENT',
        quantityChange: data.quantityChange,
        quantityBefore: data.quantityBefore,
        quantityAfter: data.quantityAfter,
        note: data.note,
        performedById: data.performedById,
      },
    });
  }
}

export { orderDetailInclude, orderSummaryInclude };
